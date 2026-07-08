import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Flame,
  Target,
  CheckCircle2,
  Timer,
  ListChecks,
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
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { useStore } from '../store/useStore'
import { Stat, Bar, Empty } from '../components/ui'
import { XpWidget } from '../App'
import { computeStreak } from '../store/gamification'
import { goalProgress, isGoalDone } from '../store/goals'
import { dayFraction, isDayFull } from '../store/habits'
import { currency, currencyShort, toCOP } from '../utils/format'
import { useUi } from '../store/useUi'
import { lastNDays, shortLabel, todayISO, addDays, daysUntil } from '../utils/date'

const PIE_COLORS = [
  '#8b5cf6',
  '#22d3ee',
  '#34d399',
  '#fbbf24',
  '#fb7185',
  '#f43f5e',
  '#6366f1',
  '#14b8a6',
]

export function Dashboard() {
  const { transactions, debts, habits, goals, tasks, focus } = useStore()
  const plans = useStore((s) => s.plans)
  const supplies = useStore((s) => s.supplies)
  const usdRate = useUi((s) => s.usdRate)

  const income = transactions
    .filter((t) => t.type === 'ingreso')
    .reduce((a, t) => a + toCOP(t.amount, t.currency, usdRate), 0)
  const expense = transactions
    .filter((t) => t.type === 'gasto')
    .reduce((a, t) => a + toCOP(t.amount, t.currency, usdRate), 0)
  const balance = income - expense
  const totalDebt = debts.reduce((a, d) => a + toCOP(d.total - d.paid, d.currency, usdRate), 0)
  const streak = computeStreak(habits)

  const today = todayISO()
  const habitsToday = habits.filter((h) => dayFraction(h, today) > 0).length

  const focusToday = focus
    .filter((f) => f.date === today)
    .reduce((a, f) => a + f.minutes, 0)
  const tasksToday = tasks.filter((t) => t.date === today)
  const tasksDone = tasksToday.filter((t) => t.done).length
  const frog = tasksToday.find((t) => t.isFrog)

  // Serie de balance acumulado últimos 14 días
  const balanceSeries = useMemo(() => {
    const days = lastNDays(14)
    let running = 0
    // base: balance antes de la ventana
    const startSet = new Set(days)
    const val = (t: (typeof transactions)[number]) =>
      (t.type === 'ingreso' ? 1 : -1) * toCOP(t.amount, t.currency, usdRate)
    transactions.forEach((t) => {
      if (!startSet.has(t.date) && t.date < days[0]) running += val(t)
    })
    return days.map((d) => {
      transactions.filter((t) => t.date === d).forEach((t) => (running += val(t)))
      return { day: shortLabel(d), balance: running }
    })
  }, [transactions, usdRate])

  // Gastos por categoría
  const byCategory = useMemo(() => {
    const map = new Map<string, number>()
    transactions
      .filter((t) => t.type === 'gasto')
      .forEach((t) => map.set(t.category, (map.get(t.category) ?? 0) + toCOP(t.amount, t.currency, usdRate)))
    return [...map.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [transactions, usdRate])

  const activeGoals = goals.filter((g) => !isGoalDone(goals, g)).slice(0, 4)

  const suppliesSoon = supplies
    .map((s) => ({ ...s, daysLeft: daysUntil(addDays(s.lastBought, s.durationDays)) }))
    .filter((s) => s.daysLeft <= 7)
    .sort((a, b) => a.daysLeft - b.daysLeft)

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Tu Quest diaria</div>
          <div className="page-sub">
            Resumen de finanzas, hábitos y metas en un solo lugar
          </div>
        </div>
        <XpWidget />
      </div>

      {/* Intención del día */}
      <Link to="/plan" style={{ display: 'block', marginBottom: 18 }}>
        <div className="card" style={{ background: 'var(--grad-soft)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <Sparkles size={22} style={{ color: 'var(--violet)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)' }}>
              Intención de hoy
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, marginTop: 2 }}>
              {plans[today]?.intention?.trim()
                ? plans[today].intention
                : 'Toca para planear tu día →'}
            </div>
          </div>
        </div>
      </Link>

      <div className="grid cols-4" style={{ marginBottom: 18 }}>
        <Stat
          label="Balance"
          value={currencyShort(balance)}
          icon={<Wallet size={20} />}
          color="#7c3aed"
          sub={`${transactions.length} movimientos`}
        />
        <Stat
          label="Ingresos"
          value={currencyShort(income)}
          icon={<TrendingUp size={20} />}
          color="#22c55e"
        />
        <Stat
          label="Gastos"
          value={currencyShort(expense)}
          icon={<TrendingDown size={20} />}
          color="#ef4444"
        />
        <Stat
          label="Racha"
          value={`${streak} días`}
          icon={<Flame size={20} />}
          color="#f59e0b"
          sub={`${habitsToday} hábitos hoy`}
        />
      </div>

      {/* Foco del día */}
      <div className="grid cols-3" style={{ marginBottom: 18 }}>
        <Stat
          label="Enfoque hoy"
          value={`${focusToday} min`}
          icon={<Timer size={20} />}
          color="#8b5cf6"
          sub="Bloques sin distracciones"
        />
        <Stat
          label="Tareas de hoy"
          value={`${tasksDone}/${tasksToday.length}`}
          icon={<ListChecks size={20} />}
          color="#22d3ee"
          sub={tasksToday.length ? `${Math.round((tasksDone / tasksToday.length) * 100)}% completado` : 'Sin tareas aún'}
        />
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 34 }}>🐸</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--emerald)' }}>
              Rana del día
            </div>
            {frog ? (
              <div style={{ fontWeight: 700, fontSize: 14, marginTop: 3, textDecoration: frog.done ? 'line-through' : 'none', opacity: frog.done ? 0.6 : 1 }}>
                {frog.title}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 3 }}>
                Elige tu tarea más importante
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid cols-2" style={{ marginBottom: 18 }}>
        <div className="card">
          <div className="card-title">
            <TrendingUp size={16} /> Balance acumulado (14 días)
          </div>
          {transactions.length === 0 ? (
            <Empty emoji="📈" text="Registra movimientos para ver tu progreso" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={balanceSeries}>
                <defs>
                  <linearGradient id="bal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="day" stroke="#8b8ba3" fontSize={11} />
                <YAxis stroke="#8b8ba3" fontSize={11} width={40} />
                <Tooltip
                  contentStyle={{
                    background: '#11111f',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12,
                  }}
                  formatter={(v: number) => currency(v)}
                />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="#7c3aed"
                  strokeWidth={2.5}
                  fill="url(#bal)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <div className="card-title">
            <TrendingDown size={16} /> Gastos por categoría
          </div>
          {byCategory.length === 0 ? (
            <Empty emoji="🍰" text="Aún no hay gastos registrados" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={byCategory}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                >
                  {byCategory.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend
                  formatter={(v) => (
                    <span style={{ color: '#8b8ba3', fontSize: 12 }}>{v}</span>
                  )}
                />
                <Tooltip
                  contentStyle={{
                    background: '#11111f',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12,
                  }}
                  formatter={(v: number) => currency(v)}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid cols-2">
        <div className="card">
          <div className="card-title">
            <Target size={16} /> Metas en progreso
          </div>
          {activeGoals.length === 0 ? (
            <Empty emoji="🎯" text="No tienes metas activas" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {activeGoals.map((g) => (
                <div key={g.id}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 7,
                      fontSize: 13,
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{g.title}</span>
                    <span style={{ color: '#8b8ba3' }}>{goalProgress(goals, g)}%</span>
                  </div>
                  <Bar
                    value={goalProgress(goals, g)}
                    max={100}
                    color={g.type === 'estudio' ? 'amber' : g.type === 'finanzas' ? 'green' : 'pink'}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title">
            <CheckCircle2 size={16} /> Hábitos de hoy
          </div>
          {habits.length === 0 ? (
            <Empty emoji="✅" text="Crea hábitos para empezar tu racha" />
          ) : (
            <div className="list">
              {habits.map((h) => {
                const done = isDayFull(h, today)
                const partial = dayFraction(h, today) > 0 && !done
                return (
                  <div className="list-row" key={h.id}>
                    <div className="row-main" style={{ borderLeft: `3px solid ${h.color}`, paddingLeft: 9 }}>
                      <div className="row-title">{h.name}</div>
                      <div className="row-sub">{h.frequency}</div>
                    </div>
                    <span className={`chip ${done ? 'green' : partial ? 'amber' : ''}`}>
                      {done ? '✓ Hecho' : partial ? 'En curso' : 'Pendiente'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {totalDebt > 0 && (
        <div className="card" style={{ marginTop: 18 }}>
          <div className="card-title">💳 Deuda pendiente total: {currency(totalDebt)}</div>
        </div>
      )}

      {suppliesSoon.length > 0 && (
        <Link to="/inventario" style={{ display: 'block', marginTop: 18 }}>
          <div className="card">
            <div className="card-title">🧴 Por acabarse pronto</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {suppliesSoon.map((s) => {
                const dl = s.daysLeft
                const cls = dl <= 2 ? 'red' : 'amber'
                const txt = dl < 0 ? `hace ${-dl}d` : dl === 0 ? 'hoy' : `${dl}d`
                return (
                  <span key={s.id} className={`chip ${cls}`}>
                    {s.emoji} {s.name} · {txt}
                  </span>
                )
              })}
            </div>
          </div>
        </Link>
      )}
    </>
  )
}
