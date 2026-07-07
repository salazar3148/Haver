import { useMemo, useState } from 'react'
import { Plus, Trash2, Flame, TrendingUp, Pencil, Check } from 'lucide-react'
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { useStore } from '../store/useStore'
import { Modal, Empty, Bar, Segmented } from '../components/ui'
import { LapseModal } from '../components/LapseModal'
import { XpWidget } from '../App'
import { computeStreak } from '../store/gamification'
import { dayFraction, isDayFull, isSubDone, habitAppliesOn } from '../store/habits'
import { uid } from '../utils/format'
import {
  currentWeek,
  currentMonth,
  dayLabelShort,
  dayOfMonth,
  todayISO,
  addDays,
  toISO,
} from '../utils/date'
import type { Habit, HabitFrequency } from '../store/types'

const EMOJIS = ['💪', '📚', '🏃', '🧘', '💧', '🥗', '😴', '✍️', '🎯', '🧠', '🦷', '🎸']
const COLORS = ['#8b5cf6', '#22d3ee', '#34d399', '#fbbf24', '#fb7185', '#f43f5e']

type View = 'semana' | 'mes'
type SubDraft = { id: string; name: string }

// Color de acento del tema activo (para el gráfico). Se lee de las CSS vars.
const accentColor = () => {
  if (typeof window === 'undefined') return '#f5291f'
  return getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#f5291f'
}

export function Habitos() {
  const { habits, addHabit, updateHabit } = useStore()
  const frozenDays = useStore((s) => s.frozenDays)
  const [modal, setModal] = useState(false)
  const [lapseModal, setLapseModal] = useState(false)
  const [view, setView] = useState<View>('semana')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('💪')
  const [color, setColor] = useState('#8b5cf6')
  const [freq, setFreq] = useState<HabitFrequency>('diario')
  const [target, setTarget] = useState('7')
  const [cue, setCue] = useState('')
  const [subs, setSubs] = useState<SubDraft[]>([])
  const [subInput, setSubInput] = useState('')
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6])

  const today = todayISO()
  const week = currentWeek()
  const streak = computeStreak(habits)
  const accent = useMemo(() => accentColor(), [habits, view])

  // Periodo seleccionado, recortado hasta hoy para el gráfico
  const period = view === 'semana' ? week : currentMonth()
  const periodPast = period.filter((d) => d <= today)

  // Cumplimiento GLOBAL de hábitos por día (%). Un solo trazo agregado en vez de
  // una línea por hábito (el detalle por hábito ya vive en la sección de abajo).
  const chartData = useMemo(() => {
    return periodPast.map((d) => {
      if (frozenDays.includes(d)) {
        return { label: view === 'semana' ? dayLabelShort(d) : String(dayOfMonth(d)), pct: null as number | null }
      }
      let done = 0
      let total = 0
      habits.forEach((h) => {
        if (toISO(new Date(h.createdAt)) <= d && habitAppliesOn(h, d)) {
          total++
          done += dayFraction(h, d)
        }
      })
      return {
        label: view === 'semana' ? dayLabelShort(d) : String(dayOfMonth(d)),
        pct: total ? Math.round((done / total) * 100) : null,
      }
    })
  }, [habits, periodPast, view, frozenDays])

  const avgPct = useMemo(() => {
    const vals = chartData.map((r) => r.pct).filter((v): v is number => v != null)
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0
  }, [chartData])

  // Desglose de cumplimiento por hábito en el periodo
  const performance = useMemo(
    () =>
      habits
        .map((h) => {
          const done = periodPast.reduce((a, d) => a + dayFraction(h, d), 0)
          const pct = periodPast.length
            ? Math.round((done / periodPast.length) * 100)
            : 0
          return { ...h, done: Math.round(done), total: periodPast.length, pct }
        })
        .sort((a, b) => b.pct - a.pct),
    [habits, periodPast]
  )

  const resetForm = () => {
    setEditingId(null)
    setName('')
    setIcon('💪')
    setColor('#8b5cf6')
    setFreq('diario')
    setTarget('7')
    setCue('')
    setSubs([])
    setSubInput('')
    setDays([0, 1, 2, 3, 4, 5, 6])
  }

  const openNew = () => {
    resetForm()
    setModal(true)
  }

  const openEdit = (h: Habit) => {
    setEditingId(h.id)
    setName(h.name)
    setIcon(h.icon)
    setColor(h.color)
    setFreq(h.frequency)
    setTarget(String(h.targetPerWeek || 7))
    setCue(h.cue)
    setSubs(h.subs.map((s) => ({ id: s.id, name: s.name })))
    setDays(h.days.length ? [...h.days] : [0, 1, 2, 3, 4, 5, 6])
    setSubInput('')
    setModal(true)
  }

  const addSub = () => {
    const v = subInput.trim()
    if (!v) return
    setSubs((s) => [...s, { id: uid(), name: v }])
    setSubInput('')
  }

  const save = () => {
    if (!name.trim()) return
    const payload = {
      name: name.trim(),
      icon,
      color,
      frequency: freq,
      targetPerWeek: freq === 'semanal' ? parseInt(target) || 3 : 7,
      days: days.length === 7 ? [] : days,
      subs,
      cue: cue.trim(),
      reward: '',
    }
    if (editingId) updateHabit(editingId, payload)
    else addHabit(payload)
    setModal(false)
    resetForm()
  }

  const barColor = (pct: number): 'green' | 'amber' | 'pink' =>
    pct >= 80 ? 'green' : pct >= 50 ? 'amber' : 'pink'

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Hábitos</div>
          <div className="page-sub">
            <Flame size={13} style={{ display: 'inline', verticalAlign: -2, color: 'var(--amber)' }} />{' '}
            Racha actual: <b style={{ color: 'var(--amber)' }}>{streak} días</b> · cada hábito da +15 XP
          </div>
        </div>
        <XpWidget />
      </div>

      <div style={{ marginBottom: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={openNew}>
          <Plus size={16} /> Nuevo hábito
        </button>
        <button className="btn" onClick={() => setLapseModal(true)}>
          😵 Registrar tropiezo
        </button>
      </div>

      {habits.length === 0 ? (
        <div className="card">
          <Empty emoji="🌱" text="Crea tu primer hábito y empieza a sumar XP" />
        </div>
      ) : (
        <>
          {/* ===== Analítica: constancia global ===== */}
          <div className="card" style={{ marginBottom: 18 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 6,
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div className="card-title" style={{ margin: 0 }}>
                <TrendingUp size={16} /> Constancia {view === 'semana' ? 'de la semana' : 'del mes'}
              </div>
              <Segmented
                value={view}
                onChange={setView}
                options={[
                  { value: 'semana', label: 'Semana' },
                  { value: 'mes', label: 'Mes' },
                ]}
              />
            </div>

            {/* Resumen del periodo */}
            <div className="constancy-head">
              <span
                className="constancy-avg"
                style={{
                  color: avgPct >= 80 ? 'var(--emerald)' : avgPct >= 50 ? 'var(--amber)' : 'var(--rose)',
                }}
              >
                {avgPct}%
              </span>
              <span className="constancy-cap">
                de cumplimiento promedio {view === 'semana' ? 'esta semana' : 'este mes'}
              </span>
            </div>

            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
                <defs>
                  <linearGradient id="habitFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={accent} stopOpacity={0.42} />
                    <stop offset="100%" stopColor={accent} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="label" stroke="#9a9ab4" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#9a9ab4"
                  fontSize={11}
                  domain={[0, 100]}
                  ticks={[0, 50, 100]}
                  tickFormatter={(v) => `${v}%`}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: '#0e0e1b',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 12,
                  }}
                  formatter={(v: number) => [`${v}% cumplido`, '']}
                  labelStyle={{ color: '#c9c9dd' }}
                />
                <Area
                  type="monotone"
                  dataKey="pct"
                  stroke={accent}
                  strokeWidth={2.6}
                  fill="url(#habitFill)"
                  connectNulls
                  dot={{ r: 2.5, fill: accent }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
            <div style={{ fontSize: 12, color: 'var(--faint)', marginTop: 4, textAlign: 'center' }}>
              Cuánto de tus hábitos aplicables cumpliste cada día. Los días congelados no cuentan.
            </div>
          </div>

          {/* ===== Cumplimiento por hábito ===== */}
          <div className="card" style={{ marginBottom: 18 }}>
            <div className="card-title">
              📊 Cumplimiento por hábito {view === 'semana' ? 'esta semana' : 'este mes'}
            </div>
            {performance.map((h) => (
              <div className="perf-row" key={h.id}>
                <div className="perf-name">
                  <span style={{ fontSize: 18 }}>{h.icon}</span>
                  {h.name}
                </div>
                <div className="perf-bar">
                  <Bar value={h.done} max={h.total || 1} color={barColor(h.pct)} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', minWidth: 52, textAlign: 'right' }}>
                  {h.done}/{h.total}
                </div>
                <div
                  className="perf-pct"
                  style={{
                    color:
                      h.pct >= 80 ? 'var(--emerald)' : h.pct >= 50 ? 'var(--amber)' : 'var(--rose)',
                  }}
                >
                  {h.pct}%
                </div>
              </div>
            ))}
          </div>

          {/* ===== Tarjetas de hábito ===== */}
          <div className="grid cols-2">
            {habits.map((h) => (
              <HabitCard key={h.id} h={h} week={week} today={today} frozenDays={frozenDays} onEdit={openEdit} />
            ))}
          </div>
        </>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editingId ? 'Editar hábito' : 'Nuevo hábito'}>
        <div className="field">
          <label>Nombre</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Leer 20 minutos" autoFocus />
        </div>
        <div className="field">
          <label>Ícono</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => setIcon(e)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  fontSize: 21,
                  border: '1px solid var(--border)',
                  background: icon === e ? `${color}33` : 'rgba(0,0,0,0.2)',
                  boxShadow: icon === e ? `0 0 0 2px ${color}` : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label>Color</label>
          <div style={{ display: 'flex', gap: 10 }}>
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 11,
                  background: c,
                  border: color === c ? '2px solid #fff' : '2px solid transparent',
                  boxShadow: color === c ? `0 0 12px -2px ${c}` : 'none',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
        </div>
        <div className="row">
          <div className="field">
            <label>Frecuencia</label>
            <select className="select" value={freq} onChange={(e) => setFreq(e.target.value as HabitFrequency)}>
              <option value="diario">Diario</option>
              <option value="semanal">Semanal</option>
            </select>
          </div>
          {freq === 'semanal' && (
            <div className="field">
              <label>Veces/semana</label>
              <input className="input" type="number" min="1" max="7" value={target} onChange={(e) => setTarget(e.target.value)} />
            </div>
          )}
        </div>
        <div className="field">
          <label>📆 Días que aplica</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'].map((d, i) => {
              const on = days.includes(i)
              return (
                <button
                  key={i}
                  onClick={() => setDays((arr) => (arr.includes(i) ? arr.filter((x) => x !== i) : [...arr, i]))}
                  style={{
                    flex: 1,
                    padding: '9px 0',
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 700,
                    border: '1px solid var(--border)',
                    background: on ? color : 'rgba(0,0,0,0.2)',
                    color: on ? '#fff' : 'var(--muted)',
                    cursor: 'pointer',
                  }}
                >
                  {d}
                </button>
              )
            })}
          </div>
          <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 6 }}>
            Los días no marcados no cuentan en tus métricas (ej. fines de semana).
          </div>
        </div>
        <div className="field">
          <label>🧩 Sub-hábitos (opcional)</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="input"
              value={subInput}
              onChange={(e) => setSubInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addSub()
                }
              }}
              placeholder="Ej. Mañana, Tarde, Noche"
            />
            <button className="btn" onClick={addSub}>
              <Plus size={16} />
            </button>
          </div>
          {subs.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              {subs.map((s) => (
                <span key={s.id} className="chip" style={{ cursor: 'pointer' }} onClick={() => setSubs((arr) => arr.filter((x) => x.id !== s.id))}>
                  {s.name} ✕
                </span>
              ))}
            </div>
          )}
          <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 8 }}>
            Si agregas sub-hábitos, el día cuenta como porcentaje según cuántos cumplas.
          </div>
        </div>
        <div className="field">
          <label>🧭 Cuándo y dónde (intención de implementación)</label>
          <input className="input" value={cue} onChange={(e) => setCue(e.target.value)} placeholder="Ej. Después de desayunar, en mi escritorio" />
        </div>
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={save}>
          {editingId ? <Check size={16} /> : <Plus size={16} />} {editingId ? 'Guardar cambios' : 'Crear hábito'}
        </button>
      </Modal>

      <LapseModal open={lapseModal} onClose={() => setLapseModal(false)} defaultArea="habito" />
    </>
  )
}

// Tarjeta de un hábito. Se puede marcar HOY o AYER (exclusivamente esos 2 días):
// hay hábitos que solo se pueden confirmar al día siguiente (ej. algo que se
// mide al despertar), así que el día anterior queda editable un día más.
function HabitCard({
  h,
  week,
  today,
  frozenDays,
  onEdit,
}: {
  h: Habit
  week: string[]
  today: string
  frozenDays: string[]
  onEdit: (h: Habit) => void
}) {
  const { toggleHabit, toggleHabitSub, removeHabit } = useStore()
  const [markDay, setMarkDay] = useState<'hoy' | 'ayer'>('hoy')
  const yesterday = addDays(today, -1)
  const targetDate = markDay === 'hoy' ? today : yesterday

  const doneThisWeek = week.filter((d) => dayFraction(h, d) > 0).length
  const goal = h.frequency === 'semanal' ? h.targetPerWeek : 7
  const hasSubs = h.subs.length > 0
  const targetFull = isDayFull(h, targetDate)
  const targetFrozen = frozenDays.includes(targetDate)
  const targetApplies = habitAppliesOn(h, targetDate)

  // Estado de un día para el mini-badge del selector Hoy/Ayer
  const dayStatus = (d: string): { cls: string; txt: string } => {
    if (frozenDays.includes(d)) return { cls: '', txt: '❄️' }
    if (!habitAppliesOn(h, d)) return { cls: '', txt: '–' }
    const frac = dayFraction(h, d)
    if (frac >= 1) return { cls: 'done', txt: '✓' }
    if (frac > 0) return { cls: 'partial', txt: Math.round(frac * 100) + '%' }
    return { cls: '', txt: '' }
  }

  const dayBtn = (mode: 'hoy' | 'ayer', iso: string, ico: string, label: string) => {
    const st = dayStatus(iso)
    return (
      <button className={`day-btn ${markDay === mode ? 'active' : ''}`} onClick={() => setMarkDay(mode)}>
        <span className="day-ico">{ico}</span>
        <span className="day-txt">{label}</span>
        <span className="day-num">{dayOfMonth(iso)}</span>
        {st.txt && <span className={`day-state ${st.cls}`}>{st.txt}</span>}
      </button>
    )
  }

  return (
    <div className="card habit-card" style={{ ['--hc' as string]: h.color }}>
      <div className="habit-top">
        <div className="habit-emoji" style={{ background: `${h.color}22`, color: h.color }}>
          {h.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="habit-name">{h.name}</div>
          <div className="habit-freq">
            {h.frequency} · {doneThisWeek}/{goal} esta semana
          </div>
        </div>
        <button className="icon-btn" title="Editar hábito" onClick={() => onEdit(h)}>
          <Pencil size={14} />
        </button>
        <button className="icon-btn danger" title="Eliminar" onClick={() => removeHabit(h.id)}>
          <Trash2 size={15} />
        </button>
      </div>

      {/* Historial de la semana (solo lectura) */}
      <div className="week-dots">
        {week.map((d) => {
          const applies = habitAppliesOn(h, d)
          const frozen = frozenDays.includes(d)
          const frac = dayFraction(h, d)
          const full = frac >= 1
          const partial = frac > 0 && !full
          return (
            <div className="dot-wrap" key={d}>
              <span className="dot-day">{dayLabelShort(d)}</span>
              <div
                className={`dot ${full ? 'done' : ''} ${partial ? 'partial' : ''} ${d === today ? 'today' : ''}`}
                style={!applies ? { opacity: 0.25 } : frozen ? { opacity: 0.5 } : undefined}
                title={frozen ? 'Día congelado' : !applies ? 'No aplica este día' : d}
              >
                {frozen ? '❄️' : !applies ? '–' : full ? '✓' : partial ? Math.round(frac * 100) + '%' : ''}
              </div>
            </div>
          )
        })}
      </div>

      {/* Marcado: se elige HOY (☀️) o AYER (🌙), exclusivamente esos 2 días */}
      <div className="habit-mark" style={{ ['--hc' as string]: h.color }}>
        <div className="day-switch">
          {dayBtn('hoy', today, '☀️', 'Hoy')}
          {dayBtn('ayer', yesterday, '🌙', 'Ayer')}
        </div>

        {targetFrozen ? (
          <div className="mark-note">❄️ Ese día está congelado, no se puede marcar.</div>
        ) : !targetApplies ? (
          <div className="mark-note">Este hábito no aplica ese día.</div>
        ) : hasSubs ? (
          <div className="sub-marks">
            {h.subs.map((s) => {
              const on = isSubDone(h, targetDate, s.id)
              return (
                <button
                  key={s.id}
                  className={`chip ${on ? 'green' : ''}`}
                  style={{ cursor: 'pointer', padding: '7px 12px' }}
                  onClick={() => toggleHabitSub(h.id, targetDate, s.id)}
                >
                  {on ? '✓ ' : ''}{s.name}
                </button>
              )
            })}
          </div>
        ) : (
          <button className={`mark-btn ${targetFull ? 'done' : ''}`} onClick={() => toggleHabit(h.id, targetDate)}>
            {targetFull ? (
              <>
                <Check size={17} /> Hecho {markDay === 'hoy' ? 'hoy' : 'ayer'}
              </>
            ) : (
              <>
                <span className="mark-ring" /> Marcar {markDay === 'hoy' ? 'hoy' : 'ayer'}
              </>
            )}
          </button>
        )}
      </div>

      {h.cue && (
        <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 6, alignItems: 'center' }}>
          🧭 <span>{h.cue}</span>
        </div>
      )}
    </div>
  )
}
