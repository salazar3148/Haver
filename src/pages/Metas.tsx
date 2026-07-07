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
  Mountain,
  Coins,
  Flag,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { Modal, Empty } from '../components/ui'
import { CurrencyToggle } from '../components/Money'
import { XpWidget } from '../App'
import { useUi } from '../store/useUi'
import { money, copHint } from '../utils/format'
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
  descendantIds,
} from '../store/goals'
import type { GoalType, GoalCadence, Goal, Currency } from '../store/types'

const TYPE_META: Record<
  GoalType,
  { label: string; color: 'green' | 'amber' | 'pink'; emoji: string; hex: string }
> = {
  finanzas: { label: 'Finanzas', color: 'green', emoji: '💰', hex: '#34d399' },
  estudio: { label: 'Estudio', color: 'amber', emoji: '📚', hex: '#f59e0b' },
  personal: { label: 'Personal', color: 'pink', emoji: '🌟', hex: '#fb7185' },
}
const CADENCE_LABEL: Record<GoalCadence, string> = {
  unica: 'Meta general',
  diaria: 'Diaria',
  semanal: 'Semanal',
}

// Anillo de progreso (SVG) para la cima de cada árbol.
function Ring({ value, size = 62, color }: { value: number; size?: number; color: string }) {
  const stroke = 6
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const off = c - (Math.min(100, Math.max(0, value)) / 100) * c
  return (
    <svg width={size} height={size} className="asc-ring" viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={off}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset .6s cubic-bezier(.22,1,.36,1)' }}
      />
      <text x="50%" y="52%" dominantBaseline="middle" textAnchor="middle" className="asc-ring-txt">
        {value}%
      </text>
    </svg>
  )
}

export function Metas() {
  const { goals, addGoal, updateGoalProgress, toggleGoalPeriod, removeGoal } = useStore()
  const usdRate = useUi((s) => s.usdRate)
  const [modal, setModal] = useState(false)
  const [parentId, setParentId] = useState<string | undefined>(undefined)
  const [title, setTitle] = useState('')
  const [type, setType] = useState<GoalType>('estudio')
  const [kind, setKind] = useState<'meta' | 'financiera'>('meta')
  const [moneyCur, setMoneyCur] = useState<Currency>('COP')
  const [cadence, setCadence] = useState<GoalCadence>('unica')
  const [target, setTarget] = useState('')
  const [unit, setUnit] = useState('')
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
    setKind('meta')
    setMoneyCur('COP')
    setCadence('unica')
    setType('estudio')
    setStartDate(todayISO())
    setDeadline(todayISO())
    if (pid) {
      const parent = goals.find((g) => g.id === pid)
      if (parent) setType(parent.type)
    }
    setModal(true)
  }

  const isMoney = kind === 'financiera'

  const save = () => {
    if (!title.trim()) return
    const effCadence: GoalCadence = isMoney ? 'unica' : cadence
    const t = effCadence === 'unica' ? parseFloat(target) || 1 : 1
    addGoal({
      title: title.trim(),
      type: isMoney ? 'finanzas' : type,
      cadence: effCadence,
      parentId,
      target: t,
      unit: isMoney ? '$' : unit.trim() || (effCadence === 'unica' ? 'u' : 'veces'),
      money: isMoney,
      currency: isMoney ? moneyCur : 'COP',
      startDate,
      deadline,
    })
    setModal(false)
  }

  // Estadísticas
  const completedCount = goals.filter((g) => isGoalDone(goals, g)).length
  const accumulated = goals.reduce((a, g) => a + pendingPeriods(g), 0)

  // ===== Nodo recursivo del árbol de ascenso =====
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
    const isSummit = depth === 0
    const state = done ? 'done' : pending > 0 ? 'danger' : 'active'
    const totalKids = isParent ? descendantIds(goals, g.id).length : 0

    return (
      <div className={`gnode d${depth} ${isSummit ? 'summit' : ''} ${done ? 'is-done' : ''}`}>
        <div className="gnode-row">
          {/* Gema / medallón en el riel */}
          <div
            className={`gnode-gem ${state} ${isSummit ? 'crown' : ''}`}
            style={{ ['--gem' as string]: done ? '#34d399' : pending > 0 ? '#f5291f' : meta.hex }}
          >
            <span className="gem-emoji">{meta.emoji}</span>
            {done && <span className="gem-seal">✓</span>}
            {isSummit && <span className="gem-flag">🚩</span>}
          </div>

          {/* Tarjeta de la meta */}
          <div
            className={`card gnode-card ${done ? 'goal-done' : ''} ${isSummit ? 'summit-card' : ''}`}
            style={{ ['--goal' as string]: meta.hex }}
          >
            <div className="gnode-head">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  className="goal-title"
                  style={{
                    textDecoration: done ? 'line-through' : 'none',
                    opacity: done ? 0.72 : 1,
                    fontSize: isSummit ? 17 : 15,
                  }}
                >
                  {g.title}
                </div>
                <div className="goal-meta">
                  <span className={`chip ${meta.color === 'green' ? 'green' : meta.color === 'amber' ? 'amber' : ''}`}>
                    {meta.emoji} {meta.label}
                  </span>
                  {g.money ? (
                    <span className="chip violet">
                      <Coins size={11} /> Financiera
                    </span>
                  ) : (
                    <span className="chip violet">{CADENCE_LABEL[g.cadence]}</span>
                  )}
                  {g.cadence === 'unica' && !isParent && (
                    <span className="chip" style={{ display: 'inline-flex', gap: 4 }}>
                      <Calendar size={11} />
                      {done ? '¡Listo!' : daysUntil(g.deadline) >= 0 ? `${daysUntil(g.deadline)}d` : 'Vencida'}
                    </span>
                  )}
                  {g.money && !isParent && !done && (
                    <span className="chip green">faltan {money(Math.max(0, g.target - g.current), g.currency)}</span>
                  )}
                  {isParent && (
                    <span className="chip" style={{ display: 'inline-flex', gap: 4 }}>
                      <GitBranch size={11} /> {totalKids} ramas
                    </span>
                  )}
                  {pending > 0 && <span className="chip red">🔴 {pending} acumuladas</span>}
                  {done && <span className="chip green">✓ Conquistada</span>}
                </div>
              </div>

              {isSummit && <Ring value={progress} color={done ? '#34d399' : meta.hex} />}

              <div style={{ display: 'flex', gap: 6, alignSelf: 'flex-start' }}>
                <button className="icon-btn" title="Añadir rama (sub-meta)" onClick={() => openNew(g.id)}>
                  <GitBranch size={15} />
                </button>
                <button className="icon-btn danger" title="Eliminar" onClick={() => removeGoal(g.id)}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            {/* Barra de progreso (no en la cima, allí manda el anillo) */}
            {!isSummit && (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12.5 }}>
                  <span style={{ color: 'var(--muted)' }}>
                    {isParent
                      ? `${kids.filter((k) => isGoalDone(goals, k)).length}/${kids.length} sub-metas`
                      : g.cadence === 'unica'
                      ? g.money
                        ? `${money(g.current, g.currency)} / ${money(g.target, g.currency)}${g.currency === 'USD' ? ` · ${copHint(g.target, g.currency, usdRate)}` : ''}`
                        : `${g.current}/${g.target} ${g.unit}`
                      : `${completedPeriods(g)}/${expectedPeriods(g)} ${g.cadence === 'diaria' ? 'días' : 'semanas'}`}
                  </span>
                  <span style={{ fontWeight: 700 }}>{progress}%</span>
                </div>
                <div className="asc-bar">
                  <div
                    className="asc-bar-fill"
                    style={{ width: `${progress}%`, background: done ? 'linear-gradient(90deg,#059669,#34d399)' : undefined }}
                  />
                </div>
              </div>
            )}

            {isSummit && (
              <div className="summit-caption">
                {isParent
                  ? `${kids.filter((k) => isGoalDone(goals, k)).length}/${kids.length} ramas conquistadas · escala hasta la cima`
                  : g.money
                  ? `${money(g.current, g.currency)} / ${money(g.target, g.currency)}${g.currency === 'USD' ? ` · ${copHint(g.target, g.currency, usdRate)}` : ''}`
                  : g.cadence === 'unica'
                  ? `${g.current}/${g.target} ${g.unit}`
                  : `${completedPeriods(g)}/${expectedPeriods(g)} ${g.cadence === 'diaria' ? 'días' : 'semanas'}`}
              </div>
            )}

            {/* Controles (solo en hojas) */}
            {!isParent && g.cadence === 'unica' && !done && (
              <div style={{ display: 'flex', gap: 8, marginTop: 13, alignItems: 'center' }}>
                <input
                  className="input"
                  type="number"
                  step={g.money && g.currency === 'USD' ? '0.01' : '1'}
                  placeholder={g.money ? (g.currency === 'USD' ? 'Aporte US$' : 'Aporte $') : `+${stepVal}`}
                  value={step[g.id] ?? ''}
                  onChange={(e) => setStep((s) => ({ ...s, [g.id]: e.target.value }))}
                  style={{ maxWidth: g.money ? 140 : 90, padding: '8px 10px' }}
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
                    ? g.cadence === 'diaria'
                      ? '✓ Cumplida hoy'
                      : '✓ Cumplida esta semana'
                    : g.cadence === 'diaria'
                    ? 'Marcar hoy'
                    : 'Marcar esta semana'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Ramas hijas: la enredadera que asciende */}
        {isParent && (
          <div className="gbranch">
            {kids.map((k) => (
              <GoalNode key={k.id} id={k.id} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  const parentGoal: Goal | undefined = parentId ? goals.find((g) => g.id === parentId) : undefined

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Metas</div>
          <div className="page-sub">Divide tu gran meta en ramas y escala desde la base hasta la cima</div>
        </div>
        <XpWidget />
      </div>

      <div className="grid cols-3" style={{ marginBottom: 18 }}>
        <div className="card stat" style={{ ['--accent' as string]: '#f5291f' }}>
          <div className="stat-label">Metas activas</div>
          <div className="stat-value">{goals.length - completedCount}</div>
          <div className="stat-icon" style={{ background: '#f5291f22', color: '#f5291f' }}>
            <Target size={18} />
          </div>
        </div>
        <div className="card stat" style={{ ['--accent' as string]: '#34d399' }}>
          <div className="stat-label">Conquistadas</div>
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
          <Mountain size={16} /> Nueva meta
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="card">
          <Empty
            emoji="🏔️"
            text="Crea tu meta cumbre y luego divídela en ramas con el botón de rama para ir escalando hacia ella"
          />
        </div>
      ) : (
        <div className="ascent-wrap">
          {roots.map((g) => (
            <div key={g.id} className="ascent">
              <GoalNode id={g.id} depth={0} />
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={parentGoal ? `Nueva rama de "${parentGoal.title}"` : 'Nueva meta'}
      >
        {parentGoal && (
          <div className="chip violet" style={{ marginBottom: 14 }}>
            <GitBranch size={12} /> Rama de: {parentGoal.title}
          </div>
        )}

        {/* Elegir tipo: meta normal vs financiera */}
        <div className="field">
          <label>¿Qué quieres conquistar?</label>
          <div className="kind-switch">
            <button className={`kind-opt ${!isMoney ? 'active' : ''}`} onClick={() => setKind('meta')}>
              <Flag size={18} />
              <span className="kind-title">Meta</span>
              <span className="kind-sub">Objetivo, hábito diario o semanal</span>
            </button>
            <button className={`kind-opt money ${isMoney ? 'active' : ''}`} onClick={() => setKind('financiera')}>
              <Coins size={18} />
              <span className="kind-title">Meta financiera</span>
              <span className="kind-sub">Ahorra o reúne una cantidad en $</span>
            </button>
          </div>
        </div>

        <div className="field">
          <label>Título</label>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={isMoney ? 'Ej. Fondo de emergencia' : 'Ej. Convertirme en backend senior'}
            autoFocus
          />
        </div>

        {!isMoney && (
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
              <label>Ritmo</label>
              <select className="select" value={cadence} onChange={(e) => setCadence(e.target.value as GoalCadence)}>
                <option value="unica">🎯 General (con objetivo)</option>
                <option value="diaria">📆 Diaria (repetir cada día)</option>
                <option value="semanal">🗓️ Semanal (repetir cada semana)</option>
              </select>
            </div>
          </div>
        )}

        {isMoney && (
          <div className="field">
            <label>Moneda</label>
            <CurrencyToggle value={moneyCur} onChange={setMoneyCur} />
          </div>
        )}

        {(isMoney || cadence === 'unica') && (
          <div className="row">
            <div className="field">
              <label>{isMoney ? 'Monto objetivo' : 'Objetivo'}</label>
              <input
                className="input"
                type="number"
                step={isMoney && moneyCur === 'USD' ? '0.01' : '1'}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder={isMoney ? (moneyCur === 'USD' ? 'Ej. 150' : 'Ej. 600000') : 'Ej. 30'}
              />
            </div>
            {!isMoney && (
              <div className="field">
                <label>Unidad</label>
                <input
                  className="input"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="horas, capítulos..."
                />
              </div>
            )}
          </div>
        )}

        <div className="row">
          <div className="field">
            <label>Fecha de inicio</label>
            <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          {(isMoney || cadence === 'unica') && (
            <div className="field">
              <label>Fecha límite</label>
              <input className="input" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
          )}
        </div>

        <button className="btn btn-primary" style={{ width: '100%' }} onClick={save}>
          <Plus size={16} /> {parentGoal ? 'Crear rama' : 'Crear meta'}
        </button>
      </Modal>
    </>
  )
}
