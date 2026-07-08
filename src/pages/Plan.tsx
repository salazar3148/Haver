import { useState } from 'react'
import {
  Sun,
  Moon,
  Plus,
  Check,
  Target,
  Repeat,
  Timer,
  Sparkles,
  CheckCircle2,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { Segmented, Bar, Empty } from '../components/ui'
import { WheelPicker } from '../components/WheelPicker'
import { XpWidget } from '../App'
import { fireConfetti } from '../utils/fx'
import { useUi } from '../store/useUi'
import { todayISO, addDays } from '../utils/date'
import { doneCurrentPeriod } from '../store/goals'
import { isDayFull } from '../store/habits'
import type { DayPlan } from '../store/types'

const TYPE_EMOJI: Record<string, string> = { finanzas: '💰', estudio: '📚', personal: '🌟' }

export function Plan() {
  const {
    tasks, habits, goals, focus, plans,
    setIntention, togglePlanHabit, togglePlanGoal, setFocusTarget, completeShutdown,
    addTask, toggleTask, setFrog, toggleHabit, toggleGoalPeriod,
  } = useStore()
  const effects = useUi((s) => s.effects)

  const [when, setWhen] = useState<'hoy' | 'manana'>(
    new Date().getHours() >= 18 ? 'manana' : 'hoy'
  )
  const date = when === 'hoy' ? todayISO() : addDays(todayISO(), 1)
  const isToday = when === 'hoy'
  const plan: DayPlan = plans[date] ?? {
    date, intention: '', habitIds: [], goalIds: [], focusTarget: 0, shutdown: false, createdAt: 0,
  }

  const [newTask, setNewTask] = useState('')
  const dayTasks = tasks.filter((t) => t.date === date)
  const dailyGoals = goals.filter((g) => g.cadence === 'diaria')
  const focusToday = focus.filter((f) => f.date === date).length

  const addQuickTask = () => {
    if (!newTask.trim()) return
    addTask({
      title: newTask.trim(), important: true, urgent: false, quickWin: false,
      isFrog: false, estimate: 1, date,
    })
    setNewTask('')
  }

  const doShutdown = () => {
    completeShutdown(date)
    if (effects) fireConfetti({ count: 150, origin: { x: 0.5, y: 0.4 } })
  }

  // ¿Qué tan listo está el plan?
  const steps = [
    plan.intention.trim().length > 0,
    dayTasks.length > 0,
    plan.habitIds.length > 0 || plan.goalIds.length > 0,
    plan.focusTarget > 0,
  ]
  const readiness = Math.round((steps.filter(Boolean).length / steps.length) * 100)

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Mi Día</div>
          <div className="page-sub">
            Planea desde la noche anterior · todo conectado con tus tareas, hábitos, metas y enfoque
          </div>
        </div>
        <XpWidget />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18, flexWrap: 'wrap' }}>
        <Segmented
          value={when}
          onChange={setWhen}
          options={[
            { value: 'hoy', label: '☀️ Hoy' },
            { value: 'manana', label: '🌙 Mañana' },
          ]}
        />
        <div className="card" style={{ flex: 1, minWidth: 200, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Plan listo</span>
          <div style={{ flex: 1 }}><Bar value={readiness} max={100} color={readiness === 100 ? 'green' : undefined} /></div>
          <span style={{ fontWeight: 800, fontSize: 14 }}>{readiness}%</span>
        </div>
      </div>

      {/* Intención del día */}
      <div className="card" style={{ marginBottom: 18, background: 'var(--grad-soft)' }}>
        <div className="card-title"><Sparkles size={16} /> Mi intención para {isToday ? 'hoy' : 'mañana'}</div>
        <input
          className="input"
          value={plan.intention}
          onChange={(e) => setIntention(date, e.target.value)}
          placeholder="Si solo logro UNA cosa, que sea..."
          style={{ fontSize: 16, fontWeight: 600 }}
        />
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
          Definir una sola intención clara te da dirección y reduce la fatiga de decisión.
        </div>
      </div>

      <div className="grid cols-2" style={{ alignItems: 'start', marginBottom: 18 }}>
        {/* Tareas */}
        <div className="card">
          <div className="card-title"><Target size={16} /> Tareas {isToday ? 'de hoy' : 'de mañana'}</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <input
              className="input"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addQuickTask()}
              placeholder="Agregar tarea y Enter"
            />
            <button className="btn btn-primary" onClick={addQuickTask}><Plus size={16} /></button>
          </div>
          {dayTasks.length === 0 ? (
            <Empty emoji="📝" text="Sin tareas. Empieza por tu tarea más importante (la rana)." />
          ) : (
            <div className="list">
              {dayTasks.map((t) => (
                <div className="list-row" key={t.id}>
                  <button
                    className="icon-btn"
                    style={{
                      borderRadius: 9,
                      color: t.done ? '#fff' : 'var(--muted)',
                      background: t.done ? 'linear-gradient(135deg,#34d399,#059669)' : undefined,
                      borderColor: t.done ? 'transparent' : undefined,
                    }}
                    onClick={() => toggleTask(t.id)}
                  >
                    <Check size={16} />
                  </button>
                  <div className="row-main">
                    <div className="row-title" style={{ textDecoration: t.done ? 'line-through' : 'none', opacity: t.done ? 0.55 : 1 }}>
                      {t.isFrog && '🐸 '}{t.title}
                    </div>
                  </div>
                  <button
                    className="icon-btn"
                    title="Marcar como la rana (lo más importante)"
                    style={{ color: t.isFrog ? 'var(--emerald)' : 'var(--muted)' }}
                    onClick={() => setFrog(t.id)}
                  >
                    🐸
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Enfoque planeado */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="card">
            <div className="card-title"><Timer size={16} /> Bloques de enfoque planeados</div>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
              <WheelPicker
                value={plan.focusTarget}
                min={0}
                max={12}
                onChange={(v) => setFocusTarget(date, v)}
              />
            </div>
            <div className="wheel-unit">bloques de 25 min</div>
            {isToday && plan.focusTarget > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)', margin: '12px 0 7px' }}>
                  <span>Completados hoy</span>
                  <span>{focusToday}/{plan.focusTarget}</span>
                </div>
                <Bar value={focusToday} max={plan.focusTarget} color={focusToday >= plan.focusTarget ? 'green' : undefined} />
              </>
            )}
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>
              Registra tus bloques desde la sección Enfoque.
            </div>
          </div>

          {/* Sub-metas diarias */}
          <div className="card">
            <div className="card-title"><Target size={16} /> Sub-metas diarias</div>
            {dailyGoals.length === 0 ? (
              <Empty emoji="🎯" text="Crea metas diarias en la sección Metas para enlazarlas aquí." />
            ) : (
              <div className="list">
                {dailyGoals.map((g) => {
                  const committed = plan.goalIds.includes(g.id)
                  const done = doneCurrentPeriod(g)
                  return (
                    <div className="list-row" key={g.id}>
                      <button
                        className="icon-btn"
                        style={{ color: committed ? 'var(--violet)' : 'var(--muted)' }}
                        title="Comprometer para este día"
                        onClick={() => togglePlanGoal(date, g.id)}
                      >
                        {committed ? '★' : '☆'}
                      </button>
                      <div className="row-main">
                        <div className="row-title">{TYPE_EMOJI[g.type]} {g.title}</div>
                      </div>
                      {isToday ? (
                        <button className={`chip ${done ? 'green' : ''}`} onClick={() => toggleGoalPeriod(g.id)} style={{ cursor: 'pointer' }}>
                          {done ? '✓ Hecha' : 'Marcar'}
                        </button>
                      ) : (
                        <span className="chip">mañana</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hábitos comprometidos */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-title"><Repeat size={16} /> Hábitos a los que me comprometo</div>
        {habits.length === 0 ? (
          <Empty emoji="🔁" text="Crea hábitos para comprometerte con ellos cada día." />
        ) : (
          <div className="grid cols-3">
            {habits.map((h) => {
              const committed = plan.habitIds.includes(h.id)
              const done = isDayFull(h, date)
              return (
                <div
                  key={h.id}
                  className="card"
                  style={{
                    padding: 14, cursor: 'pointer',
                    borderColor: committed ? h.color : 'var(--border)',
                    boxShadow: committed ? `inset 0 0 0 1px ${h.color}` : 'none',
                  }}
                  onClick={() => togglePlanHabit(date, h.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0, borderLeft: `3px solid ${h.color}`, paddingLeft: 9 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{h.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {committed ? '✓ comprometido' : 'tocar para añadir'}
                      </div>
                    </div>
                    {isToday && committed && (
                      <button
                        className="icon-btn"
                        style={{
                          width: 30, height: 30,
                          color: done ? '#fff' : 'var(--muted)',
                          background: done ? 'linear-gradient(135deg,#34d399,#059669)' : undefined,
                          borderColor: done ? 'transparent' : undefined,
                        }}
                        onClick={(e) => { e.stopPropagation(); toggleHabit(h.id, date) }}
                      >
                        <Check size={15} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Ritual de cierre */}
      <div
        className="card"
        style={{
          background: plan.shutdown ? 'linear-gradient(135deg, rgba(52,211,153,0.14), rgba(139,92,246,0.1))' : 'var(--grad-soft)',
          borderColor: plan.shutdown ? 'rgba(52,211,153,0.35)' : undefined,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 36 }}>{plan.shutdown ? '✅' : when === 'manana' ? '🌙' : '☀️'}</div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>
              {plan.shutdown ? '¡Plan confirmado!' : when === 'manana' ? 'Ritual de cierre nocturno' : 'Confirma tu plan de hoy'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
              {plan.shutdown
                ? 'Mañana solo tienes que ejecutar. Descansa tranquilo.'
                : 'Deja tu día listo: intención, tareas, hábitos y enfoque. Cerrar el día bien planeado da +25 XP.'}
            </div>
          </div>
          {!plan.shutdown ? (
            <button className="btn btn-primary" onClick={doShutdown}>
              {when === 'manana' ? <Moon size={16} /> : <Sun size={16} />} Confirmar plan
            </button>
          ) : (
            <span className="chip green"><CheckCircle2 size={14} /> Listo</span>
          )}
        </div>
      </div>
    </>
  )
}
