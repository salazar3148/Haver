import { useState } from 'react'
import { Plus, Trash2, Check, Zap } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Modal, Empty, Bar } from '../components/ui'
import { XpWidget } from '../App'
import { todayISO, shortLabel } from '../utils/date'
import type { Task } from '../store/types'

const quadrant = (t: Task) => {
  if (t.important && t.urgent) return { label: 'Hazlo ya', cls: 'red' as const }
  if (t.important && !t.urgent) return { label: 'Planifícalo', cls: 'violet' as const }
  if (!t.important && t.urgent) return { label: 'Despáchalo', cls: 'amber' as const }
  return { label: 'Opcional', cls: '' as const }
}

const score = (t: Task) =>
  (t.isFrog ? 100 : 0) + (t.important ? 2 : 0) + (t.urgent ? 1 : 0)

export function Tareas() {
  const { tasks, addTask, toggleTask, setFrog, removeTask } = useStore()
  const [modal, setModal] = useState(false)
  const [title, setTitle] = useState('')
  const [important, setImportant] = useState(true)
  const [urgent, setUrgent] = useState(false)
  const [quickWin, setQuickWin] = useState(false)
  const [estimate, setEstimate] = useState('1')
  const [date, setDate] = useState(todayISO())

  const today = todayISO()
  const todayTasks = tasks
    .filter((t) => t.date === today && !t.done)
    .sort((a, b) => score(b) - score(a))
  const upcoming = tasks
    .filter((t) => t.date > today && !t.done)
    .sort((a, b) => a.date.localeCompare(b.date))
  const completedToday = tasks.filter((t) => t.date === today && t.done)
  const frog = todayTasks.find((t) => t.isFrog) || completedToday.find((t) => t.isFrog)

  const totalToday = todayTasks.length + completedToday.length

  const save = () => {
    if (!title.trim()) return
    addTask({
      title: title.trim(),
      important,
      urgent,
      quickWin,
      isFrog: false,
      estimate: parseInt(estimate) || 1,
      date,
    })
    setTitle('')
    setQuickWin(false)
    setModal(false)
  }

  const TaskRow = ({ t }: { t: Task }) => {
    const q = quadrant(t)
    return (
      <div className="list-row">
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
            {t.isFrog && '🐸 '}
            {t.title}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
            {q.label && <span className={`chip ${q.cls}`}>{q.label}</span>}
            {t.quickWin && <span className="chip"><Zap size={11} /> 2 min</span>}
            {t.estimate > 0 && <span className="chip">🍅 {t.estimate}</span>}
            {t.date !== today && <span className="chip">{shortLabel(t.date)}</span>}
          </div>
        </div>
        {!t.done && (
          <button
            className="icon-btn"
            title="Marcar como la rana (tarea más importante)"
            style={{ color: t.isFrog ? 'var(--emerald)' : 'var(--muted)' }}
            onClick={() => setFrog(t.id)}
          >
            🐸
          </button>
        )}
        <button className="icon-btn danger" onClick={() => removeTask(t.id)}>
          <Trash2 size={15} />
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Tareas</div>
          <div className="page-sub">Prioriza con la matriz de Eisenhower y cómete la rana primero</div>
        </div>
        <XpWidget />
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={() => setModal(true)}>
          <Plus size={16} /> Nueva tarea
        </button>
        {totalToday > 0 && (
          <div className="card" style={{ flex: 1, minWidth: 220, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6, fontWeight: 600 }}>
                Progreso de hoy · {completedToday.length}/{totalToday}
              </div>
              <Bar value={completedToday.length} max={totalToday} color="green" />
            </div>
          </div>
        )}
      </div>

      {/* Rana del día */}
      {frog ? (
        <div
          className="card"
          style={{
            marginBottom: 18,
            background: 'linear-gradient(135deg, rgba(52,211,153,0.14), rgba(139,92,246,0.1))',
            borderColor: 'rgba(52,211,153,0.3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ fontSize: 38 }}>🐸</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--emerald)' }}>
                Tu rana de hoy · hazla primero
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, marginTop: 3, textDecoration: frog.done ? 'line-through' : 'none', opacity: frog.done ? 0.6 : 1 }}>
                {frog.title}
              </div>
            </div>
            {!frog.done && (
              <button className="btn btn-primary" onClick={() => toggleTask(frog.id)}>
                <Check size={16} /> Completar
              </button>
            )}
            {frog.done && <span className="chip green">✓ ¡Rana comida! +30 XP</span>}
          </div>
        </div>
      ) : (
        todayTasks.length > 0 && (
          <div className="card" style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              🐸 Aún no eliges tu <b>rana del día</b>. Marca con el botón 🐸 la tarea más importante
              y hazla primero, antes que nada.
            </div>
          </div>
        )
      )}

      <div className="grid cols-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="card-title">📋 Hoy</div>
          {todayTasks.length === 0 ? (
            <Empty emoji="☀️" text="Sin tareas pendientes para hoy" />
          ) : (
            <div className="list">{todayTasks.map((t) => <TaskRow key={t.id} t={t} />)}</div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {upcoming.length > 0 && (
            <div className="card">
              <div className="card-title">📅 Próximas</div>
              <div className="list">{upcoming.map((t) => <TaskRow key={t.id} t={t} />)}</div>
            </div>
          )}
          {completedToday.length > 0 && (
            <div className="card">
              <div className="card-title">✅ Completadas hoy ({completedToday.length})</div>
              <div className="list">{completedToday.map((t) => <TaskRow key={t.id} t={t} />)}</div>
            </div>
          )}
          <div className="card" style={{ background: 'var(--grad-soft)' }}>
            <div style={{ fontSize: 13, lineHeight: 1.6 }}>
              <b>🧠 Matriz de Eisenhower:</b> separa lo <b>importante</b> de lo <b>urgente</b>.
              Lo importante-no urgente (planifícalo) es donde crece tu futuro. Y si algo toma menos
              de 2 minutos, hazlo ya.
            </div>
          </div>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Nueva tarea">
        <div className="field">
          <label>¿Qué necesitas hacer?</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. Terminar ensayo de historia" autoFocus />
        </div>
        <div className="row">
          <div className="field">
            <label>Importancia</label>
            <button
              className={`btn ${important ? 'btn-primary' : ''}`}
              style={{ width: '100%' }}
              onClick={() => setImportant((v) => !v)}
            >
              {important ? '⭐ Importante' : 'No importante'}
            </button>
          </div>
          <div className="field">
            <label>Urgencia</label>
            <button
              className={`btn ${urgent ? 'btn-primary' : ''}`}
              style={{ width: '100%' }}
              onClick={() => setUrgent((v) => !v)}
            >
              {urgent ? '⏰ Urgente' : 'No urgente'}
            </button>
          </div>
        </div>
        <div className="row">
          <div className="field">
            <label>Pomodoros estimados</label>
            <input className="input" type="number" min="0" max="12" value={estimate} onChange={(e) => setEstimate(e.target.value)} />
          </div>
          <div className="field">
            <label>Fecha</label>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <button
            className={`btn ${quickWin ? 'btn-primary' : ''}`}
            style={{ width: '100%' }}
            onClick={() => setQuickWin((v) => !v)}
          >
            <Zap size={15} /> {quickWin ? 'Tarea de 2 minutos' : '¿Toma menos de 2 minutos?'}
          </button>
        </div>
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={save}>
          <Plus size={16} /> Agregar tarea
        </button>
      </Modal>
    </>
  )
}
