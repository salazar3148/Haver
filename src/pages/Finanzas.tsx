import { useMemo, useState } from 'react'
import {
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  CreditCard,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  PiggyBank,
  Wallet,
  Lightbulb,
  Gauge,
} from 'lucide-react'
import {
  BarChart,
  Bar as RBar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { useStore } from '../store/useStore'
import { useUi } from '../store/useUi'
import { Modal, Bar, Empty } from '../components/ui'
import { CurrencyToggle, UsdRateChip } from '../components/Money'
import { XpWidget } from '../App'
import { currency, currencyShort, money, moneyShort, toCOP, copHint } from '../utils/format'
import {
  todayISO,
  shortLabel,
  monthKey,
  monthLabel,
  monthLabelLong,
  currentMonthKey,
  addMonthsKey,
  daysInMonthKey,
} from '../utils/date'
import type { TxType, Currency } from '../store/types'

const CATS = {
  gasto: ['Comida', 'Transporte', 'Renta', 'Servicios', 'Ocio', 'Salud', 'Compras', 'Otros'],
  ingreso: ['Salario', 'Freelance', 'Inversión', 'Regalo', 'Otros'],
}

export function Finanzas() {
  const {
    transactions,
    debts,
    budgets,
    addTransaction,
    removeTransaction,
    addDebt,
    payDebt,
    removeDebt,
    setBudget,
    removeBudget,
  } = useStore()

  const usdRate = useUi((s) => s.usdRate)

  const [txModal, setTxModal] = useState(false)
  const [debtModal, setDebtModal] = useState(false)
  const [budgetModal, setBudgetModal] = useState(false)
  const [type, setType] = useState<TxType>('gasto')
  const [amount, setAmount] = useState('')
  const [cur, setCur] = useState<Currency>('COP')
  const [category, setCategory] = useState('Comida')
  const [desc, setDesc] = useState('')
  const [date, setDate] = useState(todayISO())

  const [dName, setDName] = useState('')
  const [dCreditor, setDCreditor] = useState('')
  const [dTotal, setDTotal] = useState('')
  const [dCur, setDCur] = useState<Currency>('COP')
  const [dDue, setDDue] = useState(todayISO())

  const [bCat, setBCat] = useState('Comida')
  const [bLimit, setBLimit] = useState('')
  const [bCur, setBCur] = useState<Currency>('COP')

  const [month, setMonth] = useState(currentMonthKey())
  const isCurrentMonth = month === currentMonthKey()
  const [catFilter, setCatFilter] = useState('')

  // Transacciones del mes seleccionado
  const monthTx = useMemo(
    () => transactions.filter((t) => monthKey(t.date) === month),
    [transactions, month]
  )
  // Todo se normaliza a COP para poder sumar/comparar montos en distintas monedas.
  const cop = (amt: number, c: Currency) => toCOP(amt, c, usdRate)
  const income = monthTx.filter((t) => t.type === 'ingreso').reduce((a, t) => a + cop(t.amount, t.currency), 0)
  const expense = monthTx.filter((t) => t.type === 'gasto').reduce((a, t) => a + cop(t.amount, t.currency), 0)
  const balance = income - expense
  const savingsRate = income > 0 ? Math.round((balance / income) * 100) : 0
  const incomeTx = monthTx.filter((t) => t.type === 'ingreso')
  const expenseTx = monthTx.filter((t) => t.type === 'gasto')
  const allCats = [...new Set(monthTx.map((t) => t.category))].sort()
  const shownIncome = catFilter ? incomeTx.filter((t) => t.category === catFilter) : incomeTx
  const shownExpense = catFilter ? expenseTx.filter((t) => t.category === catFilter) : expenseTx
  const shownIncomeTotal = shownIncome.reduce((a, t) => a + cop(t.amount, t.currency), 0)
  const shownExpenseTotal = shownExpense.reduce((a, t) => a + cop(t.amount, t.currency), 0)

  // Promedio diario de gasto
  const dayDivisor = isCurrentMonth ? new Date().getDate() : daysInMonthKey(month)
  const dailyAvg = expense / Math.max(1, dayDivisor)

  // Gasto por categoría (mes)
  const spentByCat = useMemo(() => {
    const m = new Map<string, number>()
    monthTx
      .filter((t) => t.type === 'gasto')
      .forEach((t) => m.set(t.category, (m.get(t.category) ?? 0) + toCOP(t.amount, t.currency, usdRate)))
    return m
  }, [monthTx, usdRate])
  const topCat = [...spentByCat.entries()].sort((a, b) => b[1] - a[1])[0]

  // serie mensual ingresos vs gastos (global)
  const monthly = useMemo(() => {
    const map = new Map<string, { ingreso: number; gasto: number }>()
    transactions.forEach((t) => {
      const k = monthKey(t.date)
      const e = map.get(k) ?? { ingreso: 0, gasto: 0 }
      e[t.type] += toCOP(t.amount, t.currency, usdRate)
      map.set(k, e)
    })
    return [...map.entries()].sort().slice(-6).map(([k, v]) => ({ mes: monthLabel(k), ...v }))
  }, [transactions, usdRate])

  const saveTx = () => {
    const n = parseFloat(amount)
    if (!n || n <= 0) return
    addTransaction({ type, amount: n, currency: cur, category, description: desc, date })
    setAmount('')
    setDesc('')
    setTxModal(false)
  }
  const saveDebt = () => {
    const n = parseFloat(dTotal)
    if (!dName || !n || n <= 0) return
    addDebt({ name: dName, creditor: dCreditor, total: n, currency: dCur, dueDate: dDue })
    setDName('')
    setDCreditor('')
    setDTotal('')
    setDebtModal(false)
  }
  const saveBudget = () => {
    const n = parseFloat(bLimit)
    if (!n || n <= 0) return
    setBudget(bCat, n, bCur)
    setBLimit('')
    setBudgetModal(false)
  }
  const openTx = (t: TxType) => {
    setType(t)
    setCategory(CATS[t][0])
    setDate(isCurrentMonth ? todayISO() : `${month}-01`)
    setTxModal(true)
  }

  const savingsColor = savingsRate >= 20 ? 'var(--emerald)' : savingsRate >= 0 ? 'var(--amber)' : 'var(--rose)'

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Finanzas</div>
          <div className="page-sub">Ingresos, gastos, presupuestos y deudas con inteligencia</div>
        </div>
        <XpWidget />
      </div>

      {/* Selector de mes */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <div className="segmented" style={{ alignItems: 'center' }}>
          <button onClick={() => setMonth((m) => addMonthsKey(m, -1))}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ padding: '0 14px', fontWeight: 700, fontSize: 14 }}>{monthLabelLong(month)}</span>
          <button onClick={() => setMonth((m) => addMonthsKey(m, 1))} disabled={isCurrentMonth} style={{ opacity: isCurrentMonth ? 0.35 : 1 }}>
            <ChevronRight size={16} />
          </button>
        </div>
        <UsdRateChip />
        <div style={{ flex: 1 }} />
        <button className="btn btn-primary" onClick={() => openTx('ingreso')}>
          <TrendingUp size={16} /> Ingreso
        </button>
        <button className="btn" onClick={() => openTx('gasto')}>
          <TrendingDown size={16} /> Gasto
        </button>
      </div>

      {/* Resumen del mes */}
      <div className="grid cols-4" style={{ marginBottom: 18 }}>
        <div className="card stat" style={{ ['--accent' as string]: '#8b5cf6' }}>
          <div className="stat-label">Balance del mes</div>
          <div className="stat-value" style={{ color: balance >= 0 ? undefined : 'var(--rose)' }}>{currencyShort(balance)}</div>
          <div className="stat-icon" style={{ background: '#8b5cf622', color: '#8b5cf6' }}><Wallet size={18} /></div>
        </div>
        <div className="card stat" style={{ ['--accent' as string]: '#34d399' }}>
          <div className="stat-label">Ingresos</div>
          <div className="stat-value" style={{ color: '#34d399' }}>{currencyShort(income)}</div>
          <div className="stat-icon" style={{ background: '#34d39922', color: '#34d399' }}><TrendingUp size={18} /></div>
        </div>
        <div className="card stat" style={{ ['--accent' as string]: '#fb7185' }}>
          <div className="stat-label">Gastos</div>
          <div className="stat-value" style={{ color: '#fb7185' }}>{currencyShort(expense)}</div>
          <div className="stat-sub">~{currencyShort(dailyAvg)}/día</div>
          <div className="stat-icon" style={{ background: '#fb718522', color: '#fb7185' }}><TrendingDown size={18} /></div>
        </div>
        <div className="card stat" style={{ ['--accent' as string]: '#22d3ee' }}>
          <div className="stat-label">Tasa de ahorro</div>
          <div className="stat-value" style={{ color: savingsColor }}>{savingsRate}%</div>
          <div className="stat-sub">Meta saludable: 20%+</div>
          <div className="stat-icon" style={{ background: '#22d3ee22', color: '#22d3ee' }}><PiggyBank size={18} /></div>
        </div>
      </div>

      {/* Insights */}
      <div className="card" style={{ marginBottom: 18, background: 'var(--grad-soft)' }}>
        <div className="card-title"><Lightbulb size={16} /> Análisis de {monthLabelLong(month)}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {income === 0 && expense === 0 ? (
            <span style={{ color: 'var(--muted)', fontSize: 14 }}>Sin movimientos este mes. Registra uno para ver tu análisis.</span>
          ) : (
            <>
              <span className="chip">💸 Promedio diario: {currencyShort(dailyAvg)}</span>
              {topCat && <span className="chip amber">🏆 Mayor gasto: {topCat[0]} ({currencyShort(topCat[1])})</span>}
              {savingsRate >= 20 && <span className="chip green">🎉 ¡Excelente! Ahorras {savingsRate}%</span>}
              {savingsRate >= 0 && savingsRate < 20 && <span className="chip amber">📈 Apunta a ahorrar al menos 20%</span>}
              {savingsRate < 0 && <span className="chip red">⚠️ Gastaste más de lo que ingresó este mes</span>}
            </>
          )}
        </div>
      </div>

      {/* Presupuestos */}
      {/* Libro: ingresos (verde) vs gastos (rojo) */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div className="card-title" style={{ margin: 0 }}><BarChart3 size={16} /> Ingresos y gastos · {monthLabelLong(month)}</div>
          {allCats.length > 0 && (
            <select className="select" value={catFilter} onChange={(e) => setCatFilter(e.target.value)} style={{ width: 'auto', minWidth: 150, padding: '8px 34px 8px 12px' }}>
              <option value="">Todas las categorías</option>
              {allCats.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
        </div>
        <div className="ledger">
          <div className="ledger-col">
            <div className="ledger-head inc">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><TrendingUp size={15} /> Ingresos</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                {currencyShort(shownIncomeTotal)}
                <button className="icon-btn" style={{ width: 28, height: 28, color: 'var(--emerald)' }} title="Agregar ingreso" onClick={() => openTx('ingreso')}>
                  <Plus size={15} />
                </button>
              </span>
            </div>
            {shownIncome.length === 0 ? (
              <div className="ledger-empty">{catFilter ? 'Sin ingresos en esta categoría' : 'Sin ingresos este mes'}</div>
            ) : (
              shownIncome.map((t) => (
                <div className="ledger-row" key={t.id}>
                  <div className="l-main">
                    {t.category}{t.description ? ` · ${t.description}` : ''}
                    <div className="l-sub">{shortLabel(t.date)}{t.currency === 'USD' ? ` · ${copHint(t.amount, t.currency, usdRate)}` : ''}</div>
                  </div>
                  <span className="ledger-amt pos">+{moneyShort(t.amount, t.currency)}</span>
                  <button className="icon-btn" style={{ width: 26, height: 26 }} onClick={() => removeTransaction(t.id)}><Trash2 size={12} /></button>
                </div>
              ))
            )}
            <div className="ledger-total"><span>Total</span><span className="pos">{currencyShort(shownIncomeTotal)}</span></div>
          </div>

          <div className="ledger-divider" />

          <div className="ledger-col">
            <div className="ledger-head exp">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><TrendingDown size={15} /> Gastos</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                {currencyShort(shownExpenseTotal)}
                <button className="icon-btn" style={{ width: 28, height: 28, color: 'var(--rose)' }} title="Agregar gasto" onClick={() => openTx('gasto')}>
                  <Plus size={15} />
                </button>
              </span>
            </div>
            {shownExpense.length === 0 ? (
              <div className="ledger-empty">{catFilter ? 'Sin gastos en esta categoría' : 'Sin gastos este mes'}</div>
            ) : (
              shownExpense.map((t) => (
                <div className="ledger-row" key={t.id}>
                  <div className="l-main">
                    {t.category}{t.description ? ` · ${t.description}` : ''}
                    <div className="l-sub">{shortLabel(t.date)}{t.currency === 'USD' ? ` · ${copHint(t.amount, t.currency, usdRate)}` : ''}</div>
                  </div>
                  <span className="ledger-amt neg">-{moneyShort(t.amount, t.currency)}</span>
                  <button className="icon-btn" style={{ width: 26, height: 26 }} onClick={() => removeTransaction(t.id)}><Trash2 size={12} /></button>
                </div>
              ))
            )}
            <div className="ledger-total"><span>Total</span><span className="neg">{currencyShort(shownExpenseTotal)}</span></div>
          </div>
        </div>
        {catFilter && (
          <div style={{ textAlign: 'center', marginTop: 14 }}>
            <span className="chip" style={{ cursor: 'pointer' }} onClick={() => setCatFilter('')}>Quitar filtro: {catFilter} ✕</span>
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="card-title" style={{ margin: 0 }}><Gauge size={16} /> Presupuestos del mes</div>
          <button className="btn btn-sm" onClick={() => setBudgetModal(true)}>
            <Plus size={14} /> Presupuesto
          </button>
        </div>
        {budgets.length === 0 ? (
          <Empty emoji="🧾" text="Define un límite mensual por categoría para no pasarte. Ej: $3,000 en Comida." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {budgets.map((b) => {
              const spent = spentByCat.get(b.category) ?? 0 // ya en COP
              const limitCOP = toCOP(b.limit, b.currency, usdRate)
              const pct = limitCOP > 0 ? (spent / limitCOP) * 100 : 0
              const over = spent > limitCOP
              const color = over ? 'pink' : pct >= 80 ? 'amber' : 'green'
              return (
                <div key={b.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7, fontSize: 13 }}>
                    <span style={{ fontWeight: 700 }}>{b.category}</span>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ color: over ? 'var(--rose)' : 'var(--muted)' }}>
                        {currencyShort(spent)} / {money(b.limit, b.currency)}
                        {over && ` · ${currencyShort(spent - limitCOP)} de más`}
                      </span>
                      <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => removeBudget(b.id)}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <Bar value={spent} max={limitCOP} color={color} />
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-title"><BarChart3 size={16} /> Ingresos vs Gastos (últimos meses)</div>
        {monthly.length === 0 ? (
          <Empty emoji="📊" text="Sin datos todavía" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthly}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="mes" stroke="#9a9ab4" fontSize={11} tickLine={false} />
              <YAxis stroke="#9a9ab4" fontSize={11} width={40} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#0e0e1b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12 }}
                formatter={(v: number) => currency(v)}
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              />
              <RBar dataKey="ingreso" fill="#34d399" radius={[6, 6, 0, 0]} />
              <RBar dataKey="gasto" fill="#fb7185" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {debts.length > 0 && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-title"><CreditCard size={16} /> Deudas</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {debts.map((d) => {
              const remaining = d.total - d.paid
              const paid = remaining <= 0
              return (
                <div key={d.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                    <div>
                      <span style={{ fontWeight: 700 }}>{d.name}</span>{' '}
                      <span style={{ color: 'var(--muted)', fontSize: 12 }}>· {d.creditor}</span>
                      {d.currency === 'USD' && (
                        <span style={{ color: 'var(--faint)', fontSize: 11 }}> · {copHint(remaining, d.currency, usdRate)}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 13, color: paid ? 'var(--emerald)' : 'var(--muted)' }}>
                        {paid ? '¡Liquidada! 🎉' : `Falta ${money(remaining, d.currency)}`}
                      </span>
                      {!paid && (
                        <button className="btn btn-sm btn-primary" onClick={() => payDebt(d.id, Math.min(remaining, d.total / 4 || remaining))}>
                          Abonar
                        </button>
                      )}
                      <button className="icon-btn" onClick={() => removeDebt(d.id)}><Trash2 size={15} /></button>
                    </div>
                  </div>
                  <Bar value={d.paid} max={d.total} color="green" />
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-title">📋 Movimientos de {monthLabelLong(month)}</div>
        {monthTx.length === 0 ? (
          <Empty emoji="💸" text="Sin movimientos este mes" />
        ) : (
          <div className="list">
            {monthTx.map((t) => {
              const inc = t.type === 'ingreso'
              return (
                <div className="list-row" key={t.id}>
                  <div className="row-icon" style={{ background: inc ? '#34d39922' : '#fb718522', color: inc ? '#34d399' : '#fb7185' }}>
                    {inc ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                  </div>
                  <div className="row-main">
                    <div className="row-title">
                      {t.category}
                      {t.description && <span style={{ color: 'var(--muted)', fontWeight: 400 }}> · {t.description}</span>}
                    </div>
                    <div className="row-sub">{shortLabel(t.date)}{t.currency === 'USD' ? ` · ${copHint(t.amount, t.currency, usdRate)}` : ''}</div>
                  </div>
                  <div className={`row-amount ${inc ? 'pos' : 'neg'}`}>{inc ? '+' : '-'}{moneyShort(t.amount, t.currency)}</div>
                  <button className="icon-btn" onClick={() => removeTransaction(t.id)}><Trash2 size={15} /></button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Modal open={txModal} onClose={() => setTxModal(false)} title={type === 'ingreso' ? 'Nuevo ingreso' : 'Nuevo gasto'}>
        <div className="field">
          <label>Moneda</label>
          <CurrencyToggle value={cur} onChange={setCur} />
        </div>
        <div className="field">
          <label>Monto {cur === 'USD' ? '(en dólares, admite decimales)' : '(en pesos)'}</label>
          <input
            className="input"
            type="number"
            step={cur === 'USD' ? '0.01' : '1'}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={cur === 'USD' ? '0.00' : '0'}
            autoFocus
          />
          {cur === 'USD' && amount && parseFloat(amount) > 0 && (
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
              {copHint(parseFloat(amount), 'USD', usdRate)} a la tasa de hoy
            </div>
          )}
        </div>
        <div className="field">
          <label>Categoría</label>
          <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATS[type].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Descripción (opcional)</label>
          <input className="input" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ej. Café con amigos" />
        </div>
        <div className="field">
          <label>Fecha</label>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={saveTx}><Plus size={16} /> Guardar</button>
      </Modal>

      <Modal open={debtModal} onClose={() => setDebtModal(false)} title="Registrar deuda">
        <div className="field">
          <label>Nombre</label>
          <input className="input" value={dName} onChange={(e) => setDName(e.target.value)} placeholder="Ej. Tarjeta de crédito" autoFocus />
        </div>
        <div className="field">
          <label>Acreedor</label>
          <input className="input" value={dCreditor} onChange={(e) => setDCreditor(e.target.value)} placeholder="Ej. Banco" />
        </div>
        <div className="field">
          <label>Moneda</label>
          <CurrencyToggle value={dCur} onChange={setDCur} />
        </div>
        <div className="row">
          <div className="field">
            <label>Monto total</label>
            <input className="input" type="number" step={dCur === 'USD' ? '0.01' : '1'} value={dTotal} onChange={(e) => setDTotal(e.target.value)} placeholder={dCur === 'USD' ? '0.00' : '0'} />
          </div>
          <div className="field">
            <label>Vencimiento</label>
            <input className="input" type="date" value={dDue} onChange={(e) => setDDue(e.target.value)} />
          </div>
        </div>
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={saveDebt}><Plus size={16} /> Guardar deuda</button>
      </Modal>

      <Modal open={budgetModal} onClose={() => setBudgetModal(false)} title="Presupuesto mensual">
        <div className="field">
          <label>Categoría</label>
          <select className="select" value={bCat} onChange={(e) => setBCat(e.target.value)}>
            {CATS.gasto.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Moneda</label>
          <CurrencyToggle value={bCur} onChange={setBCur} />
        </div>
        <div className="field">
          <label>Límite mensual</label>
          <input className="input" type="number" step={bCur === 'USD' ? '0.01' : '1'} value={bLimit} onChange={(e) => setBLimit(e.target.value)} placeholder={bCur === 'USD' ? 'Ej. 50' : 'Ej. 3000'} autoFocus />
        </div>
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={saveBudget}><Plus size={16} /> Guardar presupuesto</button>
      </Modal>
    </>
  )
}
