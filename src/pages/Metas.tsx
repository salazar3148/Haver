import { useMemo, useState } from 'react'
import {
  Plus,
  Trash2,
  Minus,
  Target,
  Calendar,
  CheckCircle2,
  GitBranch,
  Check,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { Modal, Bar, Empty } from '../components/ui'
import { XpWidget } from '../App'
import { currency } from '../utils/format'
import { todayISO, daysUntil, currentWeek, dayLabelShort } from '../utils/date'
import {
  childrenOf,
  rootGoals,
  isGoalDone,
  goalProgress,
  pendingPeriods,
  completedPeriods,
  expectedPeriods,
  doneCurrentPeriod,
} from '../store/goals'
import type { GoalType, GoalCadence } from '../store/types'

const TYPE_META: Record<GoalType, { label: string; color: 'green' | 'amber' | 'pink'; emoji: string }> = {
  finanzas: { label: 'Finanzas', color: 'green', emoji: '💰' },
  estudio: { label: 'Estudio', color: 'amber', emoji: '📚' },
  personal: { label: 'Personal', color: 'pink', emoji: '🌟' },
}
const CADENCE_LABEL: Record<GoalCadence, string> = {
  unica: 'Meta general',
  diaria: 'Diaria',
  semanal: 'Semanal',
}

export function Metas() {
  const { goals, addGoal, updateGoalProgress, toggleGoalPeriod, removeGoal } = useStore()
  const [modal, setModal] = useState(false)
  const [parentId, setParentId] = useState<string | undefined>(undefined)
  const [title, setTitle] = useState('')
  const [type, setType] = useState<GoalType>('estudio')
  const [cadence, setCadence] = useState<GoalCadence>('unica')
  const [target, setTarget] = useState('')
  const [unit, setUnit] = useState('')
  const [money, setMoney] = useState(false)
  const [startDate, setStartDate] = useState(todayISO())
  const [deadline, setDeadline] = useState(todayISO())
  const [step, setStep] = useState<Record<string, string>>({})

  const week = currentWeek()
  const roots = useMemo(() => rootGoals(goals), [goals])

  const openNew = (pid?: string) => {
    setParentId(pid)
    setTitle('')
    setTarget('')
    setUnit('')
    setMoney(false)
    if (pid) {
      const parent = goals.find((g) => g.id === pid)
      if (parent) setType(parent.type)
    }
    setModal(true)
  }

  const save = () => {
    if (!title.trim()) return
    const t = cadence === 'unica' ? parseFloat(target) || 1 : 1
    addGoal({
      title: title.trim(),
      type,
      cadence,
      parentId,
      target: t,
      unit: money ? '$' : unit.trim() || (cadence === 'unica' ? 'u' : 'veces'),
      money: cadence === 'unica' && money,
      startDate,
      deadline,
    })
    setModal(false)
  }

  // Estadísticas
  const completedCount = goals.filter((g) => isGoalDone(goals, g)).length
  const accumulated = goals.reduce((a, g) => a + pendingPeriods(g), 0)

  // ===== Nodo recursivo del árbol =====
  const GoalNode = ({ id, depth }: { id: string; depth: number }) => {
    const g = goals.find((x) => x.id === id)
    if (!g) return null
    const kids = childrenOf(goals, g.id)
    const meta = TYPE_META[g.type]
    const done = isGoalDone(goals, g)
    const progress = goalProgress(goals, g)
    const isParent = kids.length > 0
    const pending = pendingPeriods(g)
    const stepVal = parseFloat(step[g.id]) || Math.max(1, Math.round(g.target / 10))

    return (
      <div className="tree-node">
        <div className={`card goal-card ${depth === 0 ? 'root' : ''} ${done ? 'goal-done' : ''}`}>
          <div className="goal-head">
            <span className="goal-emoji">{meta.emoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="goal-title" style={{ textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.7 : 1 }}>
                {g.title}
              </div>
              <div className="goal-meta">
                <span className={`chip ${meta.color === 'green' ? 'green' : meta.color === 'amber' ? 'amber' : ''}`}>
                  {meta.label}
                </span>
                <span className="chip violet">{CADENCE_LABEL[g.cadence]}</span>
                {g.cadence === 'unica' && !isParent && (
                  <span className="chip" style={{ display: 'inline-flex', gap: 4 }}>
                    <Calendar size={11} />
                    {done ? '¡Listo!' : daysUntil(g.deadline) >= 0 ? `${daysUntil(g.deadline)}d` : 'Vencida'}
                  </span>
                )}
                {g.money && !isParent && !done && (
                  <span className="chip green">faltan {currency(Math.max(0, g.target - g.current))}</span>
                )}
                {pending > 0 && (
                  <span className="chip red">🔴 {pending} acumuladas</span>
                )}
                {done && <span className="chip green">✓ Cumplida</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="icon-btn" title="Añadir sub-meta" onClick={() => openNew(g.id)}>
                <GitBranch size={15} />
              </button>
              <button className="icon-btn danger" title="Eliminar" onClick={() => removeGoal(g.id)}>
                <Trash2 size={15} />
              </button>
            </div>
          </div>

          {/* Progreso */}
          <div style={{ marginTop: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7, fontSize: 12.5 }}>
              <span style={{ color: 'var(--muted)' }}>
                {isParent
                  ? `${kids.filter((k) => isGoalDone(goals, k)).length}/${kids.length} sub-metas`
                  : g.cadence === 'unica'
                  ? g.money
                    ? `${currency(g.current)} / ${currency(g.target)}`
                    : `${g.current}/${g.target} ${g.unit}`
                  : `${completedPeriods(g)}/${expectedPeriods(g)} ${g.cadence === 'diaria' ? 'días' : 'semanas'}`}
              </span>
              <span style={{ fontWeight: 700 }}>{progress}%</span>
            </div>
            <Bar value={progress} max={100} color={meta.color} />
          </div>

          {/* Controles (solo en hojas) */}
          {!isParent && g.cadence === 'unica' && !done && (
            <div style={{ display: 'flex', gap: 8, marginTop: 13, alignItems: 'center' }}>
              <input
                className="input"
                type="number"
                placeholder={g.money ? 'Aporte $' : `+${stepVal}`}
                value={step[g.id] ?? ''}
                onChange={(e) => setStep((s) => ({ ...s, [g.id]: e.target.value }))}
                style={{ maxWidth: g.money ? 130 : 90, padding: '8px 10px' }}
              />
              <button className="btn btn-sm" onClick={() => updateGoalProgress(g.id, -stepVal)}>
                <Minus size={14} />
              </button>
              <button className="btn btn-sm btn-primary" onClick={() => updateGoalProgress(g.id, stepVal)}>
                <Plus size={14} /> {g.money ? 'Aportar' : 'Avanzar'}
              </button>
            </div>
          )}

          {!isParent && g.cadence !== 'unica' && (
            <>
              {g.cadence === 'diaria' && (
                <div className="mini-week">
                  {week.map((d) => (
                    <div key={d} className={`mini-day ${g.completions?.includes(d) ? 'on' : ''}`}>
                      {dayLabelShort(d)}
                    </div>
                  ))}
                </div>
              )}
              <button
                className={`btn btn-sm ${doneCurrentPeriod(g) ? '' : 'btn-primary'}`}
                style={{ marginTop: 12 }}
                onClick={() => toggleGoalPeriod(g.id)}
              >
                <Check size={14} />
                {doneCurrentPeriod(g)
                  ? g.cadence === 'diaria' ? '✓ Cumplida hoy' : '✓ Cumplida esta semana'
                  : g.cadence === 'diaria' ? 'Marcar hoy' : 'Marcar esta semana'}
              </button>
            </>
          )}
        </div>

        {/* Hijos */}
        {isParent && (
          <div className="tree-children">
            {kids.map((k) => (
              <GoalNode key={k.id} id={k.id} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  const parentName = parentId ? goals.find((g) => g.id === parentId)?.title : null

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Metas</div>
          <div className="page-sub">Divide tus grandes metas en sub-metas diarias y semanales</div>
        </div>
        <XpWidget />
      </div>

      <div className="grid cols-3" style={{ marginBottom: 18 }}>
        <div className="card stat" style={{ ['--accent' as string]: '#8b5cf6' }}>
          <div className="stat-label">Metas activas</div>
          <div className="stat-value">{goals.length - completedCount}</div>
          <div className="stat-icon" style={{ background: '#8b5cf622', color: '#8b5cf6' }}>
            <Target size={18} />
          </div>
        </div>
        <div className="card stat" style={{ ['--accent' as string]: '#34d399' }}>
          <div className="stat-label">Cumplidas</div>
          <div className="stat-value">{completedCount}</div>
          <div className="stat-icon" style={{ background: '#34d39922', color: '#34d399' }}>
            <CheckCircle2 size={18} />
          </div>
        </div>
        <div className="card stat" style={{ ['--accent' as string]: '#fb7185' }}>
          <div className="stat-label">Pendientes acumuladas</div>
          <div className="stat-value" style={{ color: accumulated > 0 ? 'var(--rose)' : undefined }}>
            {accumulated}
          </div>
          <div className="stat-sub">Periodos que no cumpliste a tiempo</div>
          <div className="stat-icon" style={{ background: '#fb718522', color: '#fb7185' }}>
            🔴
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <button className="btn btn-primary" onClick={() => openNew(undefined)}>
          <Plus size={16} /> Nueva meta
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="card">
          <Empty emoji="🌳" text="Crea tu meta principal y luego divídela en sub-metas con el botón de rama" />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {roots.map((g) => (
            <GoalNode key={g.id} id={g.id} depth={0} />
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={parentName ? `Sub-meta de "${parentName}"` : 'Nueva meta'}>
        {parentName && (
          <div className="chip violet" style={{ marginBottom: 14 }}>
            <GitBranch size={12} /> Rama de: {parentName}
          </div>
        )}
        <div className="field">
          <label>Título</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. Aprobar el examen de cálculo" autoFocus />
        </div>
        <div className="row">
          <div className="field">
            <label>Categoría</label>
            <select className="select" value={type} onChange={(e) => setType(e.target.value as GoalType)}>
              <option value="estudio">📚 Estudio</option>
              <option value="finanzas">💰 Finanzas</option>
              <option value="personal">🌟 Personal</option>
            </select>
          </div>
          <div className="field">
            <label>Tipo de meta</label>
            <select className="select" value={cadence} onChange={(e) => setCadence(e.target.value as GoalCadence)}>
              <option value="unica">🎯 General (con objetivo)</option>
              <option value="diaria">📆 Diaria (repetir cada día)</option>
              <option value="semanal">🗓️ Semanal (repetir cada semana)</option>
            </select>
          </div>
        </div>
        {cadence === 'unica' && (
          <>
            <div className="field">
              <button
                className={`btn ${money ? 'btn-primary' : ''}`}
                style={{ width: '100%' }}
                onClick={() => setMoney((v) => !v)}
              >
                💰 {money ? 'Meta financiera (en dinero)' : '¿Es una meta financiera?'}
              </button>
            </div>
            <div className="row">
              <div className="field">
                <label>{money ? 'Monto objetivo' : 'Objetivo'}</label>
                <input className="input" type="number" value={target} onChange={(e) => setTarget(e.target.value)} placeholder={money ? 'Ej. 600000' : 'Ej. 30'} />
              </div>
              {!money && (
                <div className="field">
                  <label>Unidad</label>
                  <input className="input" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="horas, capítulos..." />
                </div>
              )}
            </div>
          </>
        )}
        <div className="row">
          <div className="field">
            <label>Fecha de inicio</label>
            <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          {cadence === 'unica' && (
            <div className="field">
              <label>Fecha límite</label>
              <input className="input" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
          )}
        </div>
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={save}>
          <Plus size={16} /> {parentName ? 'Crear sub-meta' : 'Crear meta'}
        </button>
      </Modal>
    </>
  )
}
