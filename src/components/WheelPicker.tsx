import { useEffect, useRef, useState } from 'react'

const ITEM = 58 // ancho de cada paso en px

interface Props {
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  colorFn?: (v: number) => string
}

// Ruleta horizontal tipo timón: se gira arrastrando; los números del centro
// se ven grandes y los de los lados se encogen y giran como un dial 3D.
export function WheelPicker({ value, min, max, step = 1, onChange, colorFn }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; pos: number } | null>(null)
  const anim = useRef<number | null>(null)
  const [w, setW] = useState(0)

  const values: number[] = []
  for (let v = min; v <= max; v += step) values.push(v)
  const idxOf = (v: number) => (v - min) / step
  const maxPos = (values.length - 1) * ITEM

  const [pos, setPos] = useState(idxOf(value) * ITEM)

  // Mide el ancho del contenedor
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const m = () => setW(el.clientWidth)
    m()
    window.addEventListener('resize', m)
    return () => window.removeEventListener('resize', m)
  }, [])

  // Sincroniza si el valor cambia desde fuera (y no estamos arrastrando)
  useEffect(() => {
    if (!drag.current && anim.current == null) setPos(idxOf(value) * ITEM)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const clamp = (p: number) => Math.max(0, Math.min(maxPos, p))

  const commit = (p: number) => {
    const v = Math.max(min, Math.min(max, min + Math.round(p / ITEM) * step))
    if (v !== value) onChange(v)
  }

  const animateTo = (target: number) => {
    if (anim.current) cancelAnimationFrame(anim.current)
    const start = pos
    const t0 = performance.now()
    const dur = 280
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / dur)
      const e = 1 - Math.pow(1 - k, 3)
      setPos(start + (target - start) * e)
      if (k < 1) anim.current = requestAnimationFrame(tick)
      else {
        anim.current = null
        commit(target)
      }
    }
    anim.current = requestAnimationFrame(tick)
  }

  const onDown = (e: React.PointerEvent) => {
    if (anim.current) {
      cancelAnimationFrame(anim.current)
      anim.current = null
    }
    drag.current = { x: e.clientX, pos }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return
    setPos(clamp(drag.current.pos - (e.clientX - drag.current.x)))
  }
  const onUp = () => {
    if (!drag.current) return
    drag.current = null
    animateTo(clamp(Math.round(pos / ITEM) * ITEM))
  }

  const center = pos / ITEM // índice flotante centrado
  const currentValue = min + Math.round(pos / ITEM) * step
  const accent = colorFn ? colorFn(currentValue) : 'var(--violet)'

  return (
    <div
      className="dial"
      ref={ref}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <div className="dial-pointer" style={{ color: accent }} />
      <div
        className="dial-track"
        style={{ transform: `translateX(${w / 2 - ITEM / 2 - pos}px)` }}
      >
        {values.map((v, i) => {
          const away = i - center
          const abs = Math.abs(away)
          const scale = Math.max(0.42, 1 - abs * 0.17)
          const opacity = Math.max(0.18, 1 - abs * 0.24)
          const angle = Math.max(-62, Math.min(62, away * 24))
          const active = Math.round(center) === i
          const major = v % 5 === 0
          return (
            <div
              key={v}
              className={`dial-item ${active ? 'active' : ''}`}
              style={{
                width: ITEM,
                transform: `rotateY(${-angle}deg) scale(${scale})`,
                opacity,
                color: active ? accent : undefined,
              }}
              onClick={() => animateTo(idxOf(v) * ITEM)}
            >
              <span className="dial-num">{v}</span>
              <span
                className={`dial-tick ${major ? 'major' : ''}`}
                style={active ? { background: accent } : undefined}
              />
            </div>
          )
        })}
      </div>
      <div className="dial-fade left" />
      <div className="dial-fade right" />
    </div>
  )
}
