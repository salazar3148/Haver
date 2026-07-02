import { useMemo, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Flag,
  Check,
  X,
  Sparkles,
} from 'lucide-react'
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
import { Modal } from '../components/ui'
import { LapseModal } from '../components/LapseModal'
import { lapseAreaMeta } from '../store/lapses'
import { XpWidget } from '../App'
import { dayCompliance, campaignSeries } from '../store/stats'
import {
  todayISO,
  fromISO,
  addDays,
  currentMonthKey,
  addMonthsKey,
  monthLabelLong,
} from '../utils/date'
import type { EventType } from '../store/types'

const WD = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do']
const EV_TYPES: Record<EventType, { label: string; emoji: string; color: string }> = {
  reunion: { label: 'Reunión', emoji: '🤝', color: '#8b5cf6' },
  cita: { label: 'Cita', emoji: '📅', color: '#22d3ee' },
  tarea: { label: 'Por hacer', emoji: '📝', color: '#fbbf24' },
  evento: { label: 'Evento', emoji: '✨', color: '#fb7185' },
}
const CAMP_COLORS = ['#8b5cf6', '#22d3ee', '#34d399', '#fbbf24', '#fb7185', '#f97316', '#60a5fa']
const CAMP_EMOJIS = ['🎯', '🚀', '🏆', '📚', '💪', '🔥', '🧠', '💼']

const ringColor = (pct: number) =>
  pct >= 80 ? '#34d399' : pct >= 50 ? '#fbbf24' : pct > 0 ? '#fb7185' : 'var(--faint)'

function Ring({ pct, size = 30 }: { pct: number; size?: number }) {
  const r = size / 2 - 3
  const c = 2 * Math.PI * r
  const color = ringColor(pct)
  return (
    <div className="cal-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
        />
      </svg>
      <div className="cal-ring-pct" style={{ color }}>{pct}</div>
    </div>
  )
}

export function Calendario() {
  const state = useStore()
  const { events, campaigns, tasks, plans, habits, goals, lapses, frozenDays, addEvent, toggleEvent, removeEvent, addCampaign, removeCampaign, toggleTask, toggleFrozenDay, freezeRange, removeLapse } = state

  const [monthKeyView, setMonthKeyView] = useState(currentMonthKey())
  const [selected, setSelected] = useState<string | null>(null)
  const [campModal, setCampModal] = useState(false)
  const [campDetailId, setCampDetailId] = useState<string | null>(null)
  const [freezeModal, setFreezeModal] = useState(false)
  const [lapseModal, setLapseModal] = useState(false)
  const [fzStart, setFzStart] = useState(todayISO())
  const [fzEnd, setFzEnd] = useState(todayISO())

  // form evento
  const [evTitle, setEvTitle] = useState('')
  const [evTime, setEvTime] = useState('')
  const [evType, setEvType] = useState<EventType>('reunion')
  // form campaña
  const [cTitle, setCTitle] = useState('')
  const [cEmoji, setCEmoji] = useState('🎯')
  const [cColor, setCColor] = useState('#8b5cf6')
  const [cStart, setCStart] = useState(todayISO())
  const [cEnd, setCEnd] = useState(addDays(todayISO(), 40))
  const [cHabitIds, setCHabitIds] = useState<string[]>([])
  const [cGoalIds, setCGoalIds] = useState<string[]>([])

  const today = todayISO()

  // Celdas del mes (lunes a domingo)
  const cells = useMemo(() => {
    const [y, m] = monthKeyView.split('-').map(Number)
    const first = `${monthKeyView}-01`
    const startDow = (fromISO(first).getDay() + 6) % 7
    const gridStart = addDays(first, -startDow)
    const daysInMonth = new Date(y, m, 0).getDate()
    const weeks = Math.ceil((startDow + daysInMonth) / 7)
    return Array.from({ length: weeks * 7 }, (_, i) => {
      const iso = addDays(gridStart, i)
      return { iso, inMonth: iso.slice(0, 7) === monthKeyView }
    })
  }, [monthKeyView])

  const eventsByDate = useMemo(() => {
    const map = new Map<string, typeof events>()
    events.forEach((e) => {
      const arr = map.get(e.date) ?? []
      arr.push(e)
      map.set(e.date, arr)
    })
    map.forEach((arr) => arr.sort((a, b) => (a.time || '99').localeCompare(b.time || '99')))
    return map
  }, [events])

  const lapsesByDate = useMemo(() => {
    const map = new Map<string, typeof lapses>()
    lapses.forEach((l) => {
      const arr = map.get(l.date) ?? []
      arr.push(l)
      map.set(l.date, arr)
    })
    map.forEach((arr) => arr.sort((a, b) => a.hour - b.hour))
    return map
  }, [lapses])

  const campaignsOn = (iso: string) => campaigns.filter((c) => iso >= c.startDate && iso <= c.endDate)
  const monthCampaigns = campaigns.filter(
    (c) => c.startDate.slice(0, 7) <= monthKeyView && c.endDate.slice(0, 7) >= monthKeyView
  )

  const saveEvent = () => {
    if (!evTitle.trim() || !selected) return
    addEvent({ title: evTitle.trim(), date: selected, time: evTime, type: evType, note: '' })
    setEvTitle('')
    setEvTime('')
  }
  const saveCampaign = () => {
    if (!cTitle.trim() || cEnd < cStart) return
    addCampaign({ title: cTitle.trim(), emoji: cEmoji, color: cColor, startDate: cStart, endDate: cEnd, habitIds: cHabitIds, goalIds: cGoalIds })
    setCTitle('')
    setCHabitIds([])
    setCGoalIds([])
    setCampModal(false)
  }
  const toggleId = (arr: string[], id: string) =>
    arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]

  const selDay = selected ? dayCompliance(state, selected) : null
  const selEvents = selected ? eventsByDate.get(selected) ?? [] : []
  const selTasks = selected ? tasks.filter((t) => t.date === selected) : []
  const selCampaigns = selected ? campaignsOn(selected) : []
  const selLapses = selected ? lapsesByDate.get(selected) ?? [] : []
  const selPlan = selected ? plans[selected] : undefined
  const campDays = cEnd >= cStart ? Math.round((fromISO(cEnd).getTime() - fromISO(cStart).getTime()) / 86400000) + 1 : 0

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Calendario</div>
          <div className="page-sub">Cada día es un gráfico vivo de tu cumplimiento · planea y traza objetivos</div>
        </div>
        <XpWidget />
      </div>

      <div className="cal-toolbar">
        <div className="segmented" style={{ alignItems: 'center' }}>
          <button onClick={() => setMonthKeyView((k) => addMonthsKey(k, -1))}><ChevronLeft size={16} /></button>
          <span className="cal-month">{monthLabelLong(monthKeyView)}</span>
          <button onClick={() => setMonthKeyView((k) => addMonthsKey(k, 1))}><ChevronRight size={16} /></button>
        </div>
        <button className="btn" onClick={() => setMonthKeyView(currentMonthKey())}>Hoy</button>
        <div style={{ flex: 1 }} />
        <button className="btn" onClick={() => { setSelected(today); }}>
          <Plus size={16} /> Evento
        </button>
        <button className="btn" onClick={() => setFreezeModal(true)}>
          ❄️ Congelar
        </button>
        <button className="btn btn-primary" onClick={() => setCampModal(true)}>
          <Flag size={16} /> Objetivo
        </button>
      </div>

      <div className="cal-weekdays">
        {WD.map((d) => <div className="cal-weekday" key={d}>{d}</div>)}
      </div>

      <div className="cal-grid">
        {cells.map(({ iso, inMonth }) => {
          const frozen = frozenDays.includes(iso)
          const dc = iso <= today && !frozen ? dayCompliance(state, iso) : null
          const evs = eventsByDate.get(iso) ?? []
          const camps = campaignsOn(iso)
          const lps = lapsesByDate.get(iso) ?? []
          const dayNum = fromISO(iso).getDate()
          return (
            <div
              key={iso}
              className={`cal-cell ${inMonth ? '' : 'out'} ${iso === today ? 'today' : ''} ${frozen ? 'frozen' : ''}`}
              onClick={() => setSelected(iso)}
            >
              {camps.length > 0 && (
                <div className="cal-campaigns">
                  {camps.slice(0, 3).map((c) => (
                    <div key={c.id} className="cal-campaign-bar" style={{ background: c.color }} title={c.title} />
                  ))}
                </div>
              )}
              <div className="cal-head">
                <span className="cal-daynum">{dayNum}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  {lps.length > 0 && (
                    <span
                      className="cal-lapse"
                      title={`${lps.length} tropiezo${lps.length > 1 ? 's' : ''}`}
                    >
                      😵{lps.length > 1 ? lps.length : ''}
                    </span>
                  )}
                  {frozen ? <span title="Día congelado" style={{ fontSize: 15 }}>❄️</span> : dc && dc.has && <Ring pct={dc.pct} />}
                </div>
              </div>
              {evs.length > 0 && (
                <div className="cal-events">
                  {evs.slice(0, 2).map((e) => (
                    <div
                      key={e.id}
                      className="cal-ev"
                      style={{ background: `${EV_TYPES[e.type].color}1f`, color: EV_TYPES[e.type].color, textDecoration: e.done ? 'line-through' : 'none', opacity: e.done ? 0.6 : 1 }}
                    >
                      <span className="cal-ev-dot" style={{ background: EV_TYPES[e.type].color }} />
                      {e.time ? `${e.time} ` : ''}{e.title}
                    </div>
                  ))}
                  {evs.length > 2 && <div className="cal-more">+{evs.length - 2} más</div>}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {monthCampaigns.length > 0 && (
        <div className="cal-legend">
          {monthCampaigns.map((c) => (
            <span
              key={c.id}
              className="cal-camp-chip"
              style={{ borderColor: c.color, color: c.color, cursor: 'pointer' }}
              onClick={() => setCampDetailId(c.id)}
            >
              {c.emoji} {c.title}
              <X size={13} style={{ cursor: 'pointer' }} onClick={(ev) => { ev.stopPropagation(); removeCampaign(c.id) }} />
            </span>
          ))}
        </div>
      )}

      {/* Detalle del día */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected ? fromISO(selected).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}>
        {selected && (
          <button
            className={`btn btn-sm ${frozenDays.includes(selected) ? 'btn-primary' : ''}`}
            style={{ marginBottom: 12 }}
            onClick={() => toggleFrozenDay(selected)}
          >
            ❄️ {frozenDays.includes(selected) ? 'Día congelado (no penaliza)' : 'Congelar día (viaje/ausencia)'}
          </button>
        )}
        {selected && frozenDays.includes(selected) ? (
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>
            Este día está congelado: no cuenta en tus métricas, pero sí se registra para que no abuses de los congelados.
          </div>
        ) : selDay && selDay.has && (
          <div className="day-meet" style={{ gap: 16 }}>
            <Ring pct={selDay.pct} size={64} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{selDay.pct}% de cumplimiento</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3 }}>
                Hábitos {selDay.habitsDone}/{selDay.habitsTotal} · Metas {selDay.goalsDone}/{selDay.goalsTotal}
              </div>
            </div>
          </div>
        )}

        {selPlan?.intention?.trim() && (
          <div className="day-meet" style={{ background: 'var(--grad-soft)' }}>
            <Sparkles size={18} style={{ color: 'var(--violet)' }} />
            <div style={{ fontSize: 13 }}><b>Intención:</b> {selPlan.intention}</div>
          </div>
        )}

        {selCampaigns.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            {selCampaigns.map((c) => (
              <span
                key={c.id}
                className="cal-camp-chip"
                style={{ borderColor: c.color, color: c.color, cursor: 'pointer' }}
                onClick={() => { setSelected(null); setCampDetailId(c.id) }}
              >
                {c.emoji} {c.title}
              </span>
            ))}
          </div>
        )}

        {/* Tropiezos del día */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>
              TROPIEZOS{selLapses.length > 0 ? ` (${selLapses.length})` : ''}
            </div>
            {selected === today && (
              <button className="btn btn-sm" onClick={() => setLapseModal(true)}>
                <Plus size={13} /> Registrar
              </button>
            )}
          </div>
          {selLapses.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--faint)' }}>
              {selDay && selDay.has
                ? 'Sin tropiezos este día. ¡Bien!'
                : 'Sin tropiezos registrados este día.'}
            </div>
          ) : (
            selLapses.map((l) => {
              const m = lapseAreaMeta(l.area)
              return (
                <div className="day-meet" key={l.id} style={{ marginBottom: 6 }}>
                  <span style={{ fontSize: 18 }}>{m.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>{l.trigger}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                      {m.label} · {String(l.hour).padStart(2, '0')}:00{l.note ? ` · ${l.note}` : ''}
                    </div>
                  </div>
                  <button className="icon-btn danger" style={{ width: 30, height: 30 }} onClick={() => removeLapse(l.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })
          )}
        </div>

        {/* Tareas del día */}
        {selTasks.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>TAREAS</div>
            {selTasks.map((t) => (
              <div className="day-meet" key={t.id} style={{ marginBottom: 6 }}>
                <button
                  className="icon-btn"
                  style={{ width: 30, height: 30, color: t.done ? '#fff' : 'var(--muted)', background: t.done ? 'linear-gradient(135deg,#34d399,#059669)' : undefined, borderColor: t.done ? 'transparent' : undefined }}
                  onClick={() => toggleTask(t.id)}
                >
                  <Check size={14} />
                </button>
                <div style={{ flex: 1, textDecoration: t.done ? 'line-through' : 'none', opacity: t.done ? 0.6 : 1, fontSize: 13.5 }}>
                  {t.isFrog && '🐸 '}{t.title}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Eventos del día */}
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>AGENDA</div>
        {selEvents.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--faint)', marginBottom: 10 }}>Sin eventos. Agrega uno abajo.</div>
        ) : (
          selEvents.map((e) => (
            <div className="day-meet" key={e.id}>
              <span style={{ fontSize: 18 }}>{EV_TYPES[e.type].emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5, textDecoration: e.done ? 'line-through' : 'none', opacity: e.done ? 0.6 : 1 }}>
                  {e.title}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                  {EV_TYPES[e.type].label}{e.time ? ` · ${e.time}` : ''}
                </div>
              </div>
              <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => toggleEvent(e.id)} title="Marcar hecho">
                <Check size={14} style={{ color: e.done ? 'var(--emerald)' : 'var(--muted)' }} />
              </button>
              <button className="icon-btn danger" style={{ width: 30, height: 30 }} onClick={() => removeEvent(e.id)}>
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}

        {/* Agregar evento */}
        <div style={{ marginTop: 12, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
          <div className="row" style={{ marginBottom: 10 }}>
            <input className="input" value={evTitle} onChange={(e) => setEvTitle(e.target.value)} placeholder="Nuevo evento / cita / reunión" style={{ flex: 2 }} />
            <input className="input" type="time" value={evTime} onChange={(e) => setEvTime(e.target.value)} style={{ flex: 1 }} />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            {(Object.keys(EV_TYPES) as EventType[]).map((t) => (
              <button
                key={t}
                className={`chip ${evType === t ? '' : ''}`}
                style={{
                  cursor: 'pointer',
                  borderColor: evType === t ? EV_TYPES[t].color : 'var(--border)',
                  color: evType === t ? EV_TYPES[t].color : 'var(--muted)',
                  background: evType === t ? `${EV_TYPES[t].color}1f` : 'var(--panel-2)',
                }}
                onClick={() => setEvType(t)}
              >
                {EV_TYPES[t].emoji} {EV_TYPES[t].label}
              </button>
            ))}
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={saveEvent}>
            <Plus size={16} /> Agregar al {selected ? fromISO(selected).getDate() : ''}
          </button>
        </div>
      </Modal>

      {/* Crear objetivo (campaña) */}
      <Modal open={campModal} onClose={() => setCampModal(false)} title="Nuevo objetivo">
        <div className="field">
          <label>Título</label>
          <input className="input" value={cTitle} onChange={(e) => setCTitle(e.target.value)} placeholder="Ej. Reto de 40 días sin azúcar" autoFocus />
        </div>
        <div className="field">
          <label>Ícono</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {CAMP_EMOJIS.map((e) => (
              <button key={e} onClick={() => setCEmoji(e)} style={{ width: 40, height: 40, borderRadius: 11, fontSize: 19, border: '1px solid var(--border)', background: cEmoji === e ? `${cColor}33` : 'rgba(0,0,0,0.2)', boxShadow: cEmoji === e ? `0 0 0 2px ${cColor}` : 'none' }}>{e}</button>
            ))}
          </div>
        </div>
        <div className="field">
          <label>Color</label>
          <div style={{ display: 'flex', gap: 10 }}>
            {CAMP_COLORS.map((c) => (
              <button key={c} onClick={() => setCColor(c)} style={{ width: 32, height: 32, borderRadius: 10, background: c, border: cColor === c ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer' }} />
            ))}
          </div>
        </div>
        <div className="row">
          <div className="field">
            <label>Inicio</label>
            <input className="input" type="date" value={cStart} onChange={(e) => setCStart(e.target.value)} />
          </div>
          <div className="field">
            <label>Fin</label>
            <input className="input" type="date" value={cEnd} onChange={(e) => setCEnd(e.target.value)} />
          </div>
        </div>

        {habits.length > 0 && (
          <div className="field">
            <label>🔁 Hábitos enlazados (opcional)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {habits.map((h) => {
                const on = cHabitIds.includes(h.id)
                return (
                  <button
                    key={h.id}
                    className="chip"
                    style={{ cursor: 'pointer', borderColor: on ? h.color : 'var(--border)', color: on ? h.color : 'var(--muted)', background: on ? `${h.color}1f` : 'var(--panel-2)' }}
                    onClick={() => setCHabitIds((a) => toggleId(a, h.id))}
                  >
                    {h.icon} {h.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}
        {goals.filter((g) => g.cadence !== 'unica').length > 0 && (
          <div className="field">
            <label>🎯 Metas enlazadas (opcional)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {goals.filter((g) => g.cadence !== 'unica').map((g) => {
                const on = cGoalIds.includes(g.id)
                return (
                  <button
                    key={g.id}
                    className="chip"
                    style={{ cursor: 'pointer', borderColor: on ? cColor : 'var(--border)', color: on ? cColor : 'var(--muted)', background: on ? `${cColor}1f` : 'var(--panel-2)' }}
                    onClick={() => setCGoalIds((a) => toggleId(a, g.id))}
                  >
                    {g.title}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 14 }}>
          {campDays > 0 ? `Durará ${campDays} días, marcados con tu color en el calendario.` : 'La fecha de fin debe ser posterior al inicio.'}
          {(cHabitIds.length > 0 || cGoalIds.length > 0) && ' El progreso del objetivo se calcula con lo enlazado.'}
        </div>
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={saveCampaign}>
          <Flag size={16} /> Trazar objetivo
        </button>
      </Modal>

      {/* Detalle del objetivo con progreso día a día */}
      <Modal open={!!campDetailId} onClose={() => setCampDetailId(null)} title="Progreso del objetivo">
        {(() => {
          const c = campaigns.find((x) => x.id === campDetailId)
          if (!c) return null
          const cs = campaignSeries(state, c)
          const linkedHabits = habits.filter((h) => c.habitIds?.includes(h.id))
          const linkedGoals = goals.filter((g) => c.goalIds?.includes(g.id))
          return (
            <>
              <div className="day-meet" style={{ gap: 14, borderColor: c.color }}>
                <div style={{ fontSize: 34 }}>{c.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{c.title}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                    Día {cs.daysElapsed} de {cs.totalDays}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 26, color: c.color }}>{cs.overall}%</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>promedio</div>
                </div>
              </div>

              {cs.series.length > 0 ? (
                <ResponsiveContainer width="100%" height={170}>
                  <AreaChart data={cs.series} margin={{ top: 8, right: 6, bottom: 0, left: -24 }}>
                    <defs>
                      <linearGradient id="campg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={c.color} stopOpacity={0.5} />
                        <stop offset="100%" stopColor={c.color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="label" stroke="#9a9ab4" fontSize={10} tickLine={false} />
                    <YAxis stroke="#9a9ab4" fontSize={10} domain={[0, 100]} width={34} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#0e0e1b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12 }}
                      formatter={(v: number) => [`${v}%`, 'Cumplimiento']}
                    />
                    <Area type="monotone" dataKey="pct" stroke={c.color} strokeWidth={2.5} fill="url(#campg)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--muted)', padding: '10px 0' }}>El objetivo aún no ha empezado.</div>
              )}

              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', margin: '12px 0 8px' }}>ENLAZADO</div>
              {linkedHabits.length === 0 && linkedGoals.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--faint)' }}>
                  Sin elementos enlazados: el progreso usa todos tus hábitos y metas recurrentes.
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {linkedHabits.map((h) => (
                    <span key={h.id} className="chip" style={{ color: h.color, borderColor: h.color }}>{h.icon} {h.name}</span>
                  ))}
                  {linkedGoals.map((g) => (
                    <span key={g.id} className="chip">🎯 {g.title}</span>
                  ))}
                </div>
              )}

              <button
                className="btn btn-danger"
                style={{ width: '100%', marginTop: 18 }}
                onClick={() => { removeCampaign(c.id); setCampDetailId(null) }}
              >
                <Trash2 size={15} /> Eliminar objetivo
              </button>
            </>
          )
        })()}
      </Modal>

      {/* Congelar rango (vacaciones / ausencia) */}
      <Modal open={freezeModal} onClose={() => setFreezeModal(false)} title="❄️ Congelar varios días">
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.6 }}>
          Marca un rango (ej. vacaciones) para que esos días no penalicen tus hábitos ni metas.
          Se cuentan en tus estadísticas para mantener la honestidad.
        </div>
        <div className="row">
          <div className="field">
            <label>Desde</label>
            <input className="input" type="date" value={fzStart} onChange={(e) => setFzStart(e.target.value)} />
          </div>
          <div className="field">
            <label>Hasta</label>
            <input className="input" type="date" value={fzEnd} onChange={(e) => setFzEnd(e.target.value)} />
          </div>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 14 }}>
          {fzEnd >= fzStart
            ? `${Math.round((fromISO(fzEnd).getTime() - fromISO(fzStart).getTime()) / 86400000) + 1} días en el rango.`
            : 'La fecha final debe ser igual o posterior a la inicial.'}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={() => { if (fzEnd >= fzStart) { freezeRange(fzStart, fzEnd, true); setFreezeModal(false) } }}
          >
            ❄️ Congelar rango
          </button>
          <button
            className="btn"
            style={{ flex: 1 }}
            onClick={() => { if (fzEnd >= fzStart) { freezeRange(fzStart, fzEnd, false); setFreezeModal(false) } }}
          >
            Descongelar
          </button>
        </div>
      </Modal>

      <LapseModal open={lapseModal} onClose={() => setLapseModal(false)} defaultArea="general" />
    </>
  )
}
