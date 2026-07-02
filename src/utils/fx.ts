import { useEffect, useRef, useState } from 'react'

// ===== Confeti en canvas (sin librerías) =====
interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  rot: number
  vrot: number
  life: number
}

export function fireConfetti(opts?: { count?: number; colors?: string[]; origin?: { x: number; y: number } }) {
  if (typeof document === 'undefined') return
  const count = opts?.count ?? 140
  const colors = opts?.colors ?? ['#8b5cf6', '#22d3ee', '#34d399', '#fbbf24', '#fb7185', '#f0abfc']
  const canvas = document.createElement('canvas')
  canvas.style.cssText =
    'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999'
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')!
  const ox = (opts?.origin?.x ?? 0.5) * canvas.width
  const oy = (opts?.origin?.y ?? 0.35) * canvas.height

  const parts: Particle[] = Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2
    const speed = 4 + Math.random() * 9
    return {
      x: ox,
      y: oy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 4,
      size: 5 + Math.random() * 7,
      color: colors[(Math.random() * colors.length) | 0],
      rot: Math.random() * Math.PI,
      vrot: (Math.random() - 0.5) * 0.4,
      life: 1,
    }
  })

  let frame = 0
  const tick = () => {
    frame++
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    parts.forEach((p) => {
      p.vy += 0.22 // gravedad
      p.vx *= 0.99
      p.x += p.vx
      p.y += p.vy
      p.rot += p.vrot
      p.life -= 0.009
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.globalAlpha = Math.max(0, p.life)
      ctx.fillStyle = p.color
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
      ctx.restore()
    })
    if (frame < 200 && parts.some((p) => p.life > 0)) {
      requestAnimationFrame(tick)
    } else {
      canvas.remove()
    }
  }
  requestAnimationFrame(tick)
}

// ===== Número animado (count up) =====
export function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(target)
  const fromRef = useRef(target)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const from = fromRef.current
    const start = performance.now()
    const animate = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(from + (target - from) * eased)
      if (t < 1) rafRef.current = requestAnimationFrame(animate)
      else fromRef.current = target
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      fromRef.current = target
    }
  }, [target, duration])

  return value
}

// ===== Jingle tipo videojuego (estilo Zelda) =====
export function playChime(kind: 'win' | 'soft' = 'win') {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext
    const ctx = new Ctx()
    // Secuencia de notas (Hz) y duración
    const seq =
      kind === 'win'
        ? [
            { f: 587.33, d: 0.12 }, // re5
            { f: 783.99, d: 0.12 }, // sol5
            { f: 987.77, d: 0.12 }, // si5
            { f: 1174.66, d: 0.34 }, // re6
          ]
        : [
            { f: 880, d: 0.16 },
            { f: 659.25, d: 0.28 },
          ]
    let t = ctx.currentTime
    seq.forEach(({ f, d }) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'triangle'
      o.frequency.setValueAtTime(f, t)
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.35, t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + d)
      o.connect(g)
      g.connect(ctx.destination)
      o.start(t)
      o.stop(t + d + 0.02)
      t += d * 0.92
    })
    setTimeout(() => ctx.close(), (t - ctx.currentTime + 0.3) * 1000)
  } catch {
    /* sin audio */
  }
}

// Color en escala verde -> rojo según la posición del valor en su rango
export function scaleColor(value: number, min: number, max: number) {
  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)))
  const hue = 130 - ratio * 130 // 130 (verde) -> 0 (rojo)
  return `hsl(${hue}, 75%, 55%)`
}
