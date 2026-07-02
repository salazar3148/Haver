import { useEffect, useMemo, useRef, useState } from 'react'
import { Play, Pause, RotateCcw, Brain, Coffee, Zap, Clock, Settings2 } from 'lucide-react'
import {
  BarChart,
  Bar as RBar,
  ResponsiveContainer,
  XAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { useStore } from '../store/useStore'
import { useUi } from '../store/useUi'
import { Stat, Modal } from '../components/ui'
import { WheelPicker } from '../components/WheelPicker'
import { XpWidget } from '../App'
import { playChime, scaleColor } from '../utils/fx'
import { todayISO, lastNDays, shortLabel } from '../utils/date'

type Phase = 'focus' | 'break'
const FOCUS_MIN = 20
const FOCUS_MAX = 90
const BREAK_MIN = 5
const BREAK_MAX = 120
const focusColorOf = (m: number) => scaleColor(m, FOCUS_MIN, FOCUS_MAX)
const breakColorOf = (m: number) => scaleColor(m, BREAK_MIN, BREAK_MAX)

export function Enfoque() {
  const { tasks, focus, addFocusSession, addLapse } = useStore()
  const { focusMin, breakMin, setFocusMin, setBreakMin } = useUi()

  const [phase, setPhase] = useState<Phase>('focus')
  const [secondsLeft, setSecondsLeft] = useState(focusMin * 60)
  const [running, setRunning] = useState(false)
  const [label, setLabel] = useState('')
  const [taskId, setTaskId] = useState('')
  const [justFinished, setJustFinished] = useState(false)
  const [review, setReview] = useState<{ minutes: number } | null>(null)
  const [reason, setReason] = useState('')
  const [config, setConfig] = useState(false)
  const tickRef = useRef<number | null>(null)

  const total = (phase === 'focus' ? focusMin : breakMin) * 60

  // Reinicia el contador al cambiar duración o fase mientras está pausado
  useEffect(() => {
    if (!running) setSecondsLeft((phase === 'focus' ? focusMin : breakMin) * 60)
  }, [focusMin, breakMin, phase, running])

  useEffect(() => {
    if (!running) return
    tickRef.current = window.setInterval(() => {
      setSecondsLeft((s) => s - 1)
    }, 1000)
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current)
    }
  }, [running])

  // Fin del ciclo
  useEffect(() => {
    if (secondsLeft > 0) return
    if (phase === 'focus') {
      playChime('win') // jingle al completar el enfoque
      setReview({ minutes: focusMin }) // pedir cómo te fue
      setPhase('break')
      setSecondsLeft(breakMin * 60)
      setRunning(true) // el descanso arranca automáticamente
    } else {
      playChime('soft') // fin del descanso
      setPhase('focus')
      setSecondsLeft(focusMin * 60)
      setRunning(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft])

  // Registrar el resultado de la sesión (concentrado o distraído)
  const logSession = (focused: boolean) => {
    if (!review) return
    addFocusSession({
      minutes: review.minutes,
      label: label.trim() || 'Sesión de enfoque',
      taskId: taskId || undefined,
      focused,
      distraction: focused ? undefined : reason.trim() || 'Distracción',
      date: todayISO(),
    })
    if (!focused) {
      addLapse({
        area: 'enfoque',
        trigger: reason.trim() || 'Distracción',
        note: label.trim(),
        date: todayISO(),
        hour: new Date().getHours(),
      })
    }
    setJustFinished(focused)
    setReview(null)
    setReason('')
  }

  // Cortar la sesión en curso y registrarla como distracción
  const giveUp = () => {
    const elapsed = Math.max(1, Math.round((focusMin * 60 - secondsLeft) / 60))
    setRunning(false)
    setReview({ minutes: elapsed })
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss = String(secondsLeft % 60).padStart(2, '0')
  const progress = ((total - secondsLeft) / total) * 100
  const R = 130
  const C = 2 * Math.PI * R

  // Estadísticas
  const today = todayISO()
  const todayMin = focus.filter((f) => f.date === today).reduce((a, f) => a + f.minutes, 0)
  const totalMin = focus.reduce((a, f) => a + f.minutes, 0)
  const todaySessions = focus.filter((f) => f.date === today).length
  const focusedCount = focus.filter((f) => f.focused).length
  const quality = focus.length ? Math.round((focusedCount / focus.length) * 100) : 0

  const weekData = useMemo(() => {
    const days = lastNDays(7)
    return days.map((d) => ({
      day: shortLabel(d),
      min: focus.filter((f) => f.date === d).reduce((a, f) => a + f.minutes, 0),
    }))
  }, [focus])

  const pending = tasks.filter((t) => !t.done && t.date === today)

  // En la página principal se respeta la estética del tema (no la escala verde→rojo)
  const accent = phase === 'focus' ? 'var(--violet)' : 'var(--emerald)'

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Enfoque</div>
          <div className="page-sub">
            Técnica Pomodoro y trabajo profundo · bloques sin distracciones
          </div>
        </div>
        <XpWidget />
      </div>

      <div className="grid cols-3" style={{ marginBottom: 18 }}>
        <Stat label="Enfoque hoy" value={`${todayMin} min`} icon={<Clock size={18} />} color="#8b5cf6" sub={`${todaySessions} sesiones`} />
        <Stat label="Calidad de enfoque" value={`${quality}%`} icon={<Brain size={18} />} color="#34d399" sub={`${focusedCount}/${focus.length} concentradas`} />
        <Stat label="Tiempo total" value={`${Math.round(totalMin / 60)} h`} icon={<Zap size={18} />} color="#22d3ee" />
      </div>

      <div className="grid cols-2" style={{ marginBottom: 18, alignItems: 'start' }}>
        {/* Temporizador */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
          <div className="phase-toggle">
            <button
              className={phase === 'focus' ? 'active' : ''}
              style={phase === 'focus' ? { background: 'var(--violet)' } : undefined}
              onClick={() => { setRunning(false); setPhase('focus') }}
            >
              <Brain size={16} /> Enfoque
            </button>
            <button
              className={phase === 'break' ? 'active' : ''}
              style={phase === 'break' ? { background: 'var(--emerald)' } : undefined}
              onClick={() => { setRunning(false); setPhase('break') }}
            >
              <Coffee size={16} /> Descanso
            </button>
          </div>

          <div className="focus-ring" style={{ position: 'relative', width: 300, height: 300, maxWidth: '80vw', maxHeight: '80vw' }}>
            <svg viewBox="0 0 300 300" width="100%" height="100%" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="150" cy="150" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="14" />
              <circle
                cx="150"
                cy="150"
                r={R}
                fill="none"
                stroke={accent}
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={C - (progress / 100) * C}
                style={{ transition: 'stroke-dashoffset 0.5s linear', filter: `drop-shadow(0 0 8px ${accent})` }}
              />
            </svg>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 'clamp(40px, 14vw, 56px)', fontWeight: 800, letterSpacing: -2 }}>
                {mm}:{ss}
              </div>
              <div style={{ color: 'var(--muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                {phase === 'focus' ? <Brain size={15} /> : <Coffee size={15} />}
                {phase === 'focus' ? 'Concentración' : 'Descanso'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" style={{ minWidth: 130 }} onClick={() => { setRunning((r) => !r); setJustFinished(false) }}>
              {running ? <><Pause size={16} /> Pausar</> : <><Play size={16} /> Iniciar</>}
            </button>
            {phase === 'focus' && (running || secondsLeft < total) && !review && (
              <button className="btn btn-danger" onClick={giveUp} title="Marcar que me distraje y terminar">
                😵 Me distraje
              </button>
            )}
            <button
              className="btn"
              onClick={() => {
                setRunning(false)
                setSecondsLeft((phase === 'focus' ? focusMin : breakMin) * 60)
              }}
            >
              <RotateCcw size={16} /> Reiniciar
            </button>
          </div>

          {review && (
            <div
              className="card"
              style={{ width: '100%', background: 'var(--grad-soft)', padding: 16 }}
            >
              <div style={{ fontWeight: 800, marginBottom: 4 }}>¿Cómo estuvo tu sesión?</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
                Sé honesto: registrar cuándo te distraes te ayuda a detectar tus detonantes.
              </div>
              <input
                className="input"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Si te distrajiste, ¿con qué? (ej. celular, ruido, cansancio)"
                style={{ marginBottom: 12 }}
              />
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => logSession(true)}>
                  ✅ Concentrado
                </button>
                <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => logSession(false)}>
                  😵 Me distraje
                </button>
              </div>
            </div>
          )}

          {justFinished && !review && (
            <div className="chip green" style={{ padding: '8px 14px' }}>
              🎉 ¡Bloque completado! Sumaste XP · toca un descanso
            </div>
          )}

          <div className="row" style={{ width: '100%', justifyContent: 'center', display: 'flex', gap: 12 }}>
            <button className="time-pill" onClick={() => setConfig(true)}>
              <Brain size={15} /> Enfoque: <b>{focusMin}</b> min
            </button>
            <button className="time-pill" onClick={() => setConfig(true)}>
              <Coffee size={15} /> Descanso: <b>{breakMin}</b> min
            </button>
            <button className="icon-btn" title="Personalizar tiempos" onClick={() => setConfig(true)}>
              <Settings2 size={16} />
            </button>
          </div>
        </div>

        {/* Panel lateral */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="card">
            <div className="card-title">🎯 ¿En qué te enfocas?</div>
            <div className="field">
              <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ej. Estudiar cálculo, capítulo 3" />
            </div>
            {pending.length > 0 && (
              <div className="field" style={{ marginBottom: 0 }}>
                <label>O elige una tarea de hoy</label>
                <select
                  className="select"
                  value={taskId}
                  onChange={(e) => {
                    setTaskId(e.target.value)
                    const t = pending.find((x) => x.id === e.target.value)
                    if (t) setLabel(t.title)
                  }}
                >
                  <option value="">— Ninguna —</option>
                  {pending.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.isFrog ? '🐸 ' : ''}{t.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-title">📈 Enfoque últimos 7 días</div>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={weekData} margin={{ top: 6, right: 6, bottom: 0, left: -22 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="day" stroke="#9a9ab4" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#0e0e1b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12 }}
                  formatter={(v: number) => [`${v} min`, 'Enfoque']}
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                />
                <RBar dataKey="min" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card" style={{ background: 'var(--grad-soft)' }}>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text)' }}>
              <b>💡 Por qué funciona:</b> trabajar en bloques cortos y sin distracciones reduce
              la fatiga de decisión y vence la procrastinación, porque comprometerte con solo
              25 minutos baja la barrera para empezar. Empezar es el 90% de la batalla.
            </div>
          </div>
        </div>
      </div>

      <Modal open={config} onClose={() => setConfig(false)} title="Personaliza tu sesión">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center', color: focusColorOf(focusMin) }}>
              <Brain size={15} /> Enfoque · {focusMin} min
            </div>
            <WheelPicker value={focusMin} min={FOCUS_MIN} max={FOCUS_MAX} onChange={setFocusMin} colorFn={focusColorOf} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center', color: breakColorOf(breakMin) }}>
              <Coffee size={15} /> Descanso · {breakMin} min
            </div>
            <WheelPicker value={breakMin} min={BREAK_MIN} max={BREAK_MAX} onChange={setBreakMin} colorFn={breakColorOf} />
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', margin: '16px 0' }}>
          Tonos verdes = bloques cortos · tonos rojos = bloques largos. Al terminar el enfoque,
          el descanso arranca solo con un sonido.
        </div>
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setConfig(false)}>
          Listo
        </button>
      </Modal>
    </>
  )
}
