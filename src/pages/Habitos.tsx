import { useMemo, useState } from 'react'
import { Plus, Trash2, Flame, LineChart as LineIcon } from 'lucide-react'
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { useStore } from '../store/useStore'
import { Modal, Empty, Bar, Segmented } from '../components/ui'
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
} from '../utils/date'
import type { HabitFrequency, TimeOfDay } from '../store/types'

const EMOJIS = ['💪', '📚', '🏃', '🧘', '💧', '🥗', '😴', '✍️', '🎯', '🧠', '🦷', '🎸']
const COLORS = ['#8b5cf6', '#22d3ee', '#34d399', '#fbbf24', '#fb7185', '#f43f5e']

const TIME_META: Record<TimeOfDay, { label: string; emoji: string; order: number }> = {
  manana: { label: 'Mañana', emoji: '🌅', order: 0 },
  dia: { label: 'Día', emoji: '☀️', order: 1 },
  tarde: { label: 'Tarde', emoji: '🌇', order: 2 },
  noche: { label: 'Noche', emoji: '🌙', order: 3 },
  '': { label: 'Sin horario', emoji: '🕒', order: 4 },
}
const TIME_ORDER: TimeOfDay[] = ['manana', 'dia', 'tarde', 'noche', '']

type View = 'semana' | 'mes'

export function Habitos() {
  const { habits, addHabit, toggleHabit, toggleHabitSub, removeHabit } = useStore()
  const frozenDays = useStore((s) => s.frozenDays)
  const [modal, setModal] = useState(false)
  const [view, setView] = useState<View>('semana')
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('💪')
  const [color, setColor] = useState('#8b5cf6')
  const [freq, setFreq] = useState<HabitFrequency>('diario')
  const [target, setTarget] = useState('7')
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('')
  const [cue, setCue] = useState('')
  const [subs, setSubs] = useState<string[]>([])
  const [subInput, setSubInput] = useState('')
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6])

  const today = todayISO()
  const week = currentWeek()
  const streak = computeStreak(habits)

  // Periodo seleccionado, recortado hasta hoy para el gráfico
  const period = view === 'semana' ? week : currentMonth()
  const periodPast = period.filter((d) => d <= today)

  // Datos del gráfico lineal: cumplimiento acumulado por hábito
  const chartData = useMemo(() => {
    const cum: Record<string, number> = {}
    habits.forEach((h) => (cum[h.id] = 0))
    return periodPast.map((d) => {
      const row: Record<string, number | string> = {
        label: view === 'semana' ? dayLabelShort(d) : String(dayOfMonth(d)),
      }
      habits.forEach((h) => {
        cum[h.id] += dayFraction(h, d)
        row[h.id] = Math.round(cum[h.id] * 10) / 10
      })
      return row
    })
  }, [habits, periodPast, view])

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

  const save = () => {
    if (!name.trim()) return
    addHabit({
      name: name.trim(),
      icon,
      color,
      frequency: freq,
      timeOfDay,
      targetPerWeek: freq === 'semanal' ? parseInt(target) || 3 : 7,
      days: days.length === 7 ? [] : days,
      subs: subs.map((s) => ({ id: uid(), name: s })),
      cue: cue.trim(),
      reward: '',
    })
    setName('')
    setCue('')
    setTimeOfDay('')
    setSubs([])
    setSubInput('')
    setDays([0, 1, 2, 3, 4, 5, 6])
    setModal(false)
  }

  const barColor = (pct: number): 'green' | 'amber' | 'pink' =>
    pct >= 80 ? 'green' : pct >= 50 ? 'amber' : 'pink'

  const renderCard = (h: (typeof habits)[number]) => {
    const doneThisWeek = week.filter((d) => dayFraction(h, d) > 0).length
    const goal = h.frequency === 'semanal' ? h.targetPerWeek : 7
    const tm = TIME_META[h.timeOfDay || '']
    const hasSubs = h.subs.length > 0
    const todayFull = isDayFull(h, today)
    return (
      <div className="card habit-card" key={h.id}>
        <div className="habit-top">
          <div className="habit-emoji" style={{ background: `${h.color}22`, color: h.color }}>
            {h.icon}
          </div>
          <div style={{ flex: 1 }}>
            <div className="habit-name">{h.name}</div>
            <div className="habit-freq">
              {h.frequency} · {doneThisWeek}/{goal} esta semana
            </div>
          </div>
          {h.timeOfDay && <span className="chip">{tm.emoji} {tm.label}</span>}
          <button className="icon-btn danger" onClick={() => removeHabit(h.id)}>
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

        {/* Solo se marca HOY */}
        {hasSubs ? (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              Hoy
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {h.subs.map((s) => {
                const on = isSubDone(h, today, s.id)
                return (
                  <button
                    key={s.id}
                    className={`chip ${on ? 'green' : ''}`}
                    style={{ cursor: 'pointer', padding: '7px 12px' }}
                    onClick={() => toggleHabitSub(h.id, today, s.id)}
                  >
                    {on ? '✓ ' : ''}{s.name}
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <button
            className={`btn btn-sm ${todayFull ? '' : 'btn-primary'}`}
            style={{ alignSelf: 'flex-start' }}
            onClick={() => toggleHabit(h.id, today)}
          >
            {todayFull ? '✓ Hecho hoy' : 'Marcar hoy'}
          </button>
        )}

        {h.cue && (
          <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 6, alignItems: 'center' }}>
            🧭 <span>{h.cue}</span>
          </div>
        )}
      </div>
    )
  }

  const anyClassified = habits.some((h) => h.timeOfDay)

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

      <div style={{ marginBottom: 18 }}>
        <button className="btn btn-primary" onClick={() => setModal(true)}>
          <Plus size={16} /> Nuevo hábito
        </button>
      </div>

      {habits.length === 0 ? (
        <div className="card">
          <Empty emoji="🌱" text="Crea tu primer hábito y empieza a sumar XP" />
        </div>
      ) : (
        <>
          {/* ===== Analítica ===== */}
          <div className="card" style={{ marginBottom: 18 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 18,
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div className="card-title" style={{ margin: 0 }}>
                <LineIcon size={16} /> Progreso por {view === 'semana' ? 'semana' : 'mes'}
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

            <div className="legend">
              {habits.map((h) => (
                <div className="legend-item" key={h.id}>
                  <span className="legend-swatch" style={{ background: h.color }} />
                  {h.icon} {h.name}
                </div>
              ))}
            </div>

            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData} margin={{ top: 10, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="label" stroke="#9a9ab4" fontSize={11} tickLine={false} />
                <YAxis stroke="#9a9ab4" fontSize={11} allowDecimals={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: '#0e0e1b',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 12,
                  }}
                  formatter={(v: number, _n, p) => {
                    const h = habits.find((x) => x.id === p.dataKey)
                    return [`${v} veces`, h ? `${h.icon} ${h.name}` : '']
                  }}
                />
                {habits.map((h) => (
                  <Line
                    key={h.id}
                    type="monotone"
                    dataKey={h.id}
                    stroke={h.color}
                    strokeWidth={2.5}
                    dot={{ r: 2.5, fill: h.color }}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
            <div style={{ fontSize: 12, color: 'var(--faint)', marginTop: 8, textAlign: 'center' }}>
              Líneas que se mantienen planas = hábitos que no estás cumpliendo
            </div>
          </div>

          {/* ===== Cumplimiento por hábito ===== */}
          <div className="card" style={{ marginBottom: 18 }}>
            <div className="card-title">
              📊 Cumplimiento {view === 'semana' ? 'esta semana' : 'este mes'}
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

          {/* ===== Tarjetas de hábito (semana lun-dom) ===== */}
          {!anyClassified ? (
            <div className="grid cols-2">{habits.map((h) => renderCard(h))}</div>
          ) : (
            TIME_ORDER.map((t) => {
              const group = habits.filter((h) => (h.timeOfDay || '') === t)
              if (!group.length) return null
              const m = TIME_META[t]
              return (
                <div key={t}>
                  <div className="section-title">{m.emoji} {m.label}</div>
                  <div className="grid cols-2">{group.map((h) => renderCard(h))}</div>
                </div>
              )
            })
          )}
        </>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Nuevo hábito">
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
          <label>🕒 Momento del día (opcional)</label>
          <select className="select" value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value as TimeOfDay)}>
            <option value="">Sin horario específico</option>
            <option value="manana">🌅 Mañana</option>
            <option value="dia">☀️ Día</option>
            <option value="tarde">🌇 Tarde</option>
            <option value="noche">🌙 Noche</option>
          </select>
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
                if (e.key === 'Enter' && subInput.trim()) {
                  setSubs((s) => [...s, subInput.trim()])
                  setSubInput('')
                }
              }}
              placeholder="Ej. Mañana, Tarde, Noche"
            />
            <button
              className="btn"
              onClick={() => {
                if (subInput.trim()) {
                  setSubs((s) => [...s, subInput.trim()])
                  setSubInput('')
                }
              }}
            >
              <Plus size={16} />
            </button>
          </div>
          {subs.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              {subs.map((s, i) => (
                <span key={i} className="chip" style={{ cursor: 'pointer' }} onClick={() => setSubs((arr) => arr.filter((_, j) => j !== i))}>
                  {s} ✕
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
          <Plus size={16} /> Crear hábito
        </button>
      </Modal>
    </>
  )
}
