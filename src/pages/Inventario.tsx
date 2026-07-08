import { useMemo, useState } from 'react'
import {
  Plus,
  Trash2,
  Check,
  Zap,
  Package,
  ShoppingCart,
  Sparkles,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Store,
  LineChart,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { useUi } from '../store/useUi'
import { Modal, Empty, Segmented } from '../components/ui'
import { CurrencyToggle, UsdRateChip } from '../components/Money'
import { XpWidget } from '../App'
import { currency, currencyShort, money, copHint, toCOP } from '../utils/format'
import { addDays, daysUntil, todayISO, shortLabel } from '../utils/date'
import type { WishPriority, Currency, PriceItem } from '../store/types'

type Tab = 'consumibles' | 'compras' | 'deseos' | 'precios'

const PRICE_EMOJIS = ['🛒', '☕', '🥑', '🍗', '🥛', '🧀', '🍞', '🧻', '⛽', '💊', '🍫', '🧴']

// Mini-gráfico de línea (sparkline) del histórico de precios.
function Sparkline({ values, w = 132, h = 36 }: { values: number[]; w?: number; h?: number }) {
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const step = w / (values.length - 1)
  const pts = values.map((v, i) => {
    const x = i * step
    const y = h - 4 - ((v - min) / range) * (h - 8)
    return [x, y] as const
  })
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const last = pts[pts.length - 1]
  const up = values[values.length - 1] > values[0]
  const color = up ? '#fb7185' : '#34d399'
  return (
    <svg width={w} height={h} className="sparkline" viewBox={`0 0 ${w} ${h}`}>
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r={3.2} fill={color} />
    </svg>
  )
}

// Analiza el histórico (normalizado a COP) para saber si el último precio es
// bueno o caro comparado con lo que sueles pagar.
function analyzePrices(item: PriceItem, rate: number) {
  const pts = [...item.history].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : a.createdAt - b.createdAt
  )
  const cop = pts.map((p) => toCOP(p.price, p.currency, rate))
  const n = cop.length
  const latest = n ? pts[n - 1] : null
  const latestCOP = n ? cop[n - 1] : 0
  const min = n ? Math.min(...cop) : 0
  const max = n ? Math.max(...cop) : 0
  const avg = n ? cop.reduce((a, b) => a + b, 0) / n : 0
  let cls = 'neutral'
  let txt = 'Registra al menos 2 precios para comparar'
  let pct: number | null = null
  if (n >= 2) {
    const spread = max - min || 1
    pct = Math.round(((latestCOP - avg) / avg) * 100)
    if (latestCOP <= min + spread * 0.05) {
      cls = 'great'
      txt = '¡El más barato que has registrado! Buen momento'
    } else if (latestCOP < avg) {
      cls = 'good'
      txt = 'Por debajo de tu promedio'
    } else if (latestCOP <= avg + spread * 0.05) {
      cls = 'mid'
      txt = 'Cerca de tu promedio'
    } else {
      cls = 'high'
      txt = 'Por encima de tu promedio (caro)'
    }
  }
  return { pts, cop, latest, latestCOP, min, max, avg, cls, txt, pct, n }
}

// Clasifica un precio puntual del historial frente al promedio, para pintar
// cada fila de "Registro" con su propio color (barato/normal/caro) en vez de
// que todo el texto se vea blanco/monótono.
function rowClass(cop: number, avg: number) {
  if (!avg) return 'row-mid'
  if (cop <= avg * 0.95) return 'row-low'
  if (cop >= avg * 1.05) return 'row-high'
  return 'row-mid'
}

const SUPPLY_EMOJIS = ['🧴', '🪥', '☕', '🧻', '🧼', '🥛', '🍚', '💊', '🧂', '🧽', '🚿', '🪒']
const WISH_EMOJIS = ['🎧', '⌨️', '📱', '👟', '🎮', '📷', '⌚', '🚲', '💻', '🪑', '🎸', '🎁']

const PRIORITY_META: Record<WishPriority, { label: string; emoji: string; cls: string; order: number }> = {
  alta: { label: 'Lo quiero ya', emoji: '🔥', cls: 'p-high', order: 0 },
  media: { label: 'Me gustaría', emoji: '⭐', cls: 'p-mid', order: 1 },
  baja: { label: 'Algún día', emoji: '💤', cls: 'p-low', order: 2 },
}

export function Inventario() {
  const {
    supplies,
    addSupply,
    restockSupply,
    removeSupply,
    shopping,
    addShoppingItem,
    toggleShoppingItem,
    removeShoppingItem,
    clearBoughtShopping,
    wishlist,
    addWish,
    removeWish,
    moveWishToShopping,
    priceItems,
    addPriceItem,
    removePriceItem,
    addPricePoint,
    removePricePoint,
  } = useStore()

  const usdRate = useUi((s) => s.usdRate)
  const [tab, setTab] = useState<Tab>('consumibles')

  // Consumible
  const [supplyModal, setSupplyModal] = useState(false)
  const [sName, setSName] = useState('')
  const [sEmoji, setSEmoji] = useState('🧴')
  const [sDuration, setSDuration] = useState('30')
  const [sPrice, setSPrice] = useState('')
  const [sCur, setSCur] = useState<Currency>('COP')

  // Compras
  const [shopInput, setShopInput] = useState('')

  // Deseo
  const [wishModal, setWishModal] = useState(false)
  const [wName, setWName] = useState('')
  const [wEmoji, setWEmoji] = useState('🎁')
  const [wPrice, setWPrice] = useState('')
  const [wPriority, setWPriority] = useState<WishPriority>('media')
  const [wNote, setWNote] = useState('')
  const [wCur, setWCur] = useState<Currency>('COP')

  // Precios: crear producto a seguir
  const [priceItemModal, setPriceItemModal] = useState(false)
  const [piName, setPiName] = useState('')
  const [piEmoji, setPiEmoji] = useState('🛒')
  const [piUnit, setPiUnit] = useState('')
  // Precios: registrar un precio para un producto (ppItem = id abierto)
  const [ppItem, setPpItem] = useState<string | null>(null)
  const [ppPrice, setPpPrice] = useState('')
  const [ppCur, setPpCur] = useState<Currency>('COP')
  const [ppStore, setPpStore] = useState('')
  const [ppDate, setPpDate] = useState(todayISO())

  const suppliesSorted = useMemo(
    () =>
      [...supplies]
        .map((s) => ({ ...s, daysLeft: daysUntil(addDays(s.lastBought, s.durationDays)) }))
        .sort((a, b) => a.daysLeft - b.daysLeft),
    [supplies]
  )
  const soonCount = suppliesSorted.filter((s) => s.daysLeft <= 7).length
  const pendingShop = shopping.filter((s) => !s.bought).length
  const boughtShop = shopping.filter((s) => s.bought).length
  const wishTotal = wishlist.reduce((a, w) => a + toCOP(w.price || 0, w.currency, usdRate), 0)
  const wishSorted = useMemo(
    () => [...wishlist].sort((a, b) => PRIORITY_META[a.priority].order - PRIORITY_META[b.priority].order),
    [wishlist]
  )

  const saveSupply = () => {
    if (!sName.trim()) return
    addSupply({
      name: sName.trim(),
      emoji: sEmoji || '🧴',
      durationDays: parseInt(sDuration) || 30,
      price: parseFloat(sPrice) || 0,
      currency: sCur,
    })
    setSName('')
    setSEmoji('🧴')
    setSDuration('30')
    setSPrice('')
    setSCur('COP')
    setSupplyModal(false)
  }

  const saveWish = () => {
    if (!wName.trim()) return
    addWish({
      name: wName.trim(),
      emoji: wEmoji || '🎁',
      price: parseFloat(wPrice) || 0,
      currency: wCur,
      note: wNote.trim(),
      priority: wPriority,
    })
    setWName('')
    setWEmoji('🎁')
    setWPrice('')
    setWNote('')
    setWPriority('media')
    setWCur('COP')
    setWishModal(false)
  }

  const addShop = () => {
    if (!shopInput.trim()) return
    addShoppingItem(shopInput)
    setShopInput('')
  }

  const savePriceItem = () => {
    if (!piName.trim()) return
    addPriceItem({ name: piName.trim(), emoji: piEmoji || '🛒', unit: piUnit.trim() })
    setPiName('')
    setPiEmoji('🛒')
    setPiUnit('')
    setPriceItemModal(false)
  }
  const openAddPrice = (id: string) => {
    setPpItem(id)
    setPpPrice('')
    setPpStore('')
    setPpCur('COP')
    setPpDate(todayISO())
  }
  const savePricePoint = () => {
    const n = parseFloat(ppPrice)
    if (!ppItem || !n || n <= 0) return
    addPricePoint(ppItem, { price: n, currency: ppCur, store: ppStore.trim(), date: ppDate })
    setPpItem(null)
  }
  const ppItemObj = ppItem ? priceItems.find((p) => p.id === ppItem) : null

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Inventario</div>
          <div className="page-sub">Tus consumibles, tu lista de compras y tus deseos, todo en un solo cofre</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <UsdRateChip />
          <XpWidget />
        </div>
      </div>

      {/* Resumen */}
      <div className="grid cols-3" style={{ marginBottom: 18 }}>
        <div className="card stat" style={{ ['--accent' as string]: '#f5291f' }}>
          <div className="stat-label">Por acabarse pronto</div>
          <div className="stat-value" style={{ color: soonCount > 0 ? 'var(--rose)' : undefined }}>{soonCount}</div>
          <div className="stat-sub">consumibles ≤ 7 días</div>
          <div className="stat-icon" style={{ background: '#f5291f22', color: '#f5291f' }}><Package size={18} /></div>
        </div>
        <div className="card stat" style={{ ['--accent' as string]: '#22d3ee' }}>
          <div className="stat-label">En lista de compras</div>
          <div className="stat-value">{pendingShop}</div>
          <div className="stat-sub">{boughtShop > 0 ? `${boughtShop} ya comprados` : 'pendientes'}</div>
          <div className="stat-icon" style={{ background: '#22d3ee22', color: '#22d3ee' }}><ShoppingCart size={18} /></div>
        </div>
        <div className="card stat" style={{ ['--accent' as string]: '#a855f7' }}>
          <div className="stat-label">Deseos</div>
          <div className="stat-value">{wishlist.length}</div>
          <div className="stat-sub">{wishTotal > 0 ? `${currencyShort(wishTotal)} en total` : 'cosas que quieres'}</div>
          <div className="stat-icon" style={{ background: '#a855f722', color: '#a855f7' }}><Sparkles size={18} /></div>
        </div>
      </div>

      {/* Pestañas */}
      <div style={{ marginBottom: 18 }}>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'consumibles', label: `🔋 Consumibles${supplies.length ? ` (${supplies.length})` : ''}` },
            { value: 'compras', label: `🛒 Compras${pendingShop ? ` (${pendingShop})` : ''}` },
            { value: 'deseos', label: `✨ Deseos${wishlist.length ? ` (${wishlist.length})` : ''}` },
            { value: 'precios', label: `📉 Precios${priceItems.length ? ` (${priceItems.length})` : ''}` },
          ]}
        />
      </div>

      {/* ===== CONSUMIBLES ===== */}
      {tab === 'consumibles' && (
        <>
          <div style={{ marginBottom: 16 }}>
            <button className="btn btn-primary" onClick={() => setSupplyModal(true)}>
              <Plus size={16} /> Nuevo consumible
            </button>
          </div>
          {supplies.length === 0 ? (
            <div className="card">
              <Empty emoji="🧴" text="Agrega tus consumibles (pasta, café, jabón...) y te muestro cuánta 'vida' les queda antes de acabarse." />
            </div>
          ) : (
            <div className="inv-grid">
              {suppliesSorted.map((s) => {
                const life = s.durationDays > 0 ? Math.max(0, Math.min(1, s.daysLeft / s.durationDays)) : 0
                const pct = Math.round(life * 100)
                const state = s.daysLeft <= 2 ? 'crit' : s.daysLeft <= 7 ? 'warn' : 'ok'
                const txt =
                  s.daysLeft < 0 ? `se acabó hace ${-s.daysLeft}d` : s.daysLeft === 0 ? 'se acaba hoy' : `${s.daysLeft} días`
                return (
                  <div className={`card supply-card ${state}`} key={s.id}>
                    <div className="supply-head">
                      <div className="supply-emoji">{s.emoji}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="supply-name">{s.name}</div>
                        <div className="supply-sub">
                          dura ~{s.durationDays}d{s.price > 0 ? ` · ${money(s.price, s.currency)}` : ''}
                        </div>
                      </div>
                      <button className="icon-btn" onClick={() => removeSupply(s.id)} title="Eliminar">
                        <Trash2 size={15} />
                      </button>
                    </div>

                    {/* Medidor de "vida" tipo batería */}
                    <div className="battery" title={`${pct}% de vida`}>
                      <div className="battery-fill" style={{ width: `${pct}%` }} />
                      <span className="battery-label">{txt}</span>
                    </div>

                    <button
                      className="btn btn-sm mark-restock"
                      onClick={() => restockSupply(s.id)}
                      title="Marcar como recién comprado (reinicia el conteo y registra el gasto si tiene precio)"
                    >
                      <Zap size={14} /> Reabastecer
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ===== COMPRAS ===== */}
      {tab === 'compras' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
            <div className="card-title" style={{ margin: 0 }}>
              <ShoppingCart size={16} /> Lista de compras
            </div>
            {boughtShop > 0 && (
              <button className="btn btn-sm" onClick={clearBoughtShopping}>
                Quitar {boughtShop} comprados
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <input
              className="input"
              value={shopInput}
              onChange={(e) => setShopInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addShop()}
              placeholder="Ej. Bolsas de basura, jabón..."
            />
            <button className="btn btn-primary" onClick={addShop}>
              <Plus size={16} />
            </button>
          </div>

          {shopping.length === 0 ? (
            <Empty emoji="🛒" text="Anota lo que te hace falta comprar y ve tachándolo. Tip: puedes mandar aquí un deseo desde la pestaña Deseos." />
          ) : (
            <div className="shop-list">
              {[...shopping]
                .sort((a, b) => Number(a.bought) - Number(b.bought))
                .map((s) => (
                  <div className={`shop-item ${s.bought ? 'bought' : ''}`} key={s.id}>
                    <button className={`shop-check ${s.bought ? 'on' : ''}`} onClick={() => toggleShoppingItem(s.id)}>
                      <Check size={15} />
                    </button>
                    <span className="shop-name">{s.name}</span>
                    <button className="icon-btn" onClick={() => removeShoppingItem(s.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ===== DESEOS ===== */}
      {tab === 'deseos' && (
        <>
          <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => setWishModal(true)}>
              <Plus size={16} /> Nuevo deseo
            </button>
            {wishTotal > 0 && (
              <span className="chip violet" style={{ fontSize: 13 }}>
                💰 Cuestan {currency(wishTotal)} en total
              </span>
            )}
          </div>

          {wishlist.length === 0 ? (
            <div className="card">
              <Empty emoji="✨" text="Anota eso que quieres comprar algún día con su precio. Así lo tienes a la vista, sin que se te olvide, y decides cuándo ir por ello." />
            </div>
          ) : (
            <div className="inv-grid">
              {wishSorted.map((w) => {
                const pm = PRIORITY_META[w.priority]
                return (
                  <div className={`card wish-card ${pm.cls}`} key={w.id}>
                    <div className="wish-shine" />
                    <div className="wish-top">
                      <div className="wish-emoji">{w.emoji}</div>
                      <span className={`wish-prio ${pm.cls}`}>
                        {pm.emoji} {pm.label}
                      </span>
                    </div>
                    <div className="wish-name">{w.name}</div>
                    {w.note && <div className="wish-note">{w.note}</div>}
                    <div className="wish-price">
                      {w.price > 0 ? money(w.price, w.currency) : 'Sin precio'}
                      {w.price > 0 && w.currency === 'USD' && (
                        <span className="wish-cop">{copHint(w.price, w.currency, usdRate)}</span>
                      )}
                    </div>
                    <div className="wish-actions">
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => moveWishToShopping(w.id)}
                        title="Mover a la lista de compras"
                      >
                        <ArrowRight size={14} /> A comprar
                      </button>
                      <button className="icon-btn" onClick={() => removeWish(w.id)} title="Eliminar deseo">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ===== PRECIOS (seguimiento de compras recurrentes) ===== */}
      {tab === 'precios' && (
        <>
          <div style={{ marginBottom: 16 }}>
            <button className="btn btn-primary" onClick={() => setPriceItemModal(true)}>
              <Plus size={16} /> Seguir un producto
            </button>
          </div>
          {priceItems.length === 0 ? (
            <div className="card">
              <Empty
                emoji="📉"
                text="Sigue el precio de lo que compras seguido (café, arroz, gasolina...). Cada vez que veas su precio, regístralo y te digo si está barato o caro según tu historial."
              />
            </div>
          ) : (
            <div className="inv-grid">
              {priceItems.map((it) => {
                const a = analyzePrices(it, usdRate)
                return (
                  <div className={`card price-card ${a.cls}`} key={it.id}>
                    <div className="price-head">
                      <div className="price-emoji">{it.emoji}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="price-name">{it.name}</div>
                        {it.unit && <div className="price-unit">por {it.unit}</div>}
                      </div>
                      <button className="icon-btn" onClick={() => removePriceItem(it.id)} title="Dejar de seguir">
                        <Trash2 size={15} />
                      </button>
                    </div>

                    {a.n === 0 ? (
                      <div className="price-empty">Aún sin precios. Registra el primero 👇</div>
                    ) : (
                      <>
                        <div className="price-now-row">
                          <div>
                            <div className="price-now">
                              {a.latest ? money(a.latest.price, a.latest.currency) : '—'}
                            </div>
                            <div className="price-now-sub">
                              último precio
                              {a.latest && a.latest.currency === 'USD' ? ` · ${copHint(a.latest.price, a.latest.currency, usdRate)}` : ''}
                            </div>
                          </div>
                          <Sparkline values={a.cop} />
                        </div>

                        <div className={`price-verdict ${a.cls}`}>
                          {a.cls === 'great' || a.cls === 'good' ? (
                            <TrendingDown size={14} />
                          ) : a.cls === 'high' ? (
                            <TrendingUp size={14} />
                          ) : (
                            <LineChart size={14} />
                          )}
                          <span>{a.txt}</span>
                          {a.pct != null && a.pct !== 0 && (
                            <b>{a.pct > 0 ? `+${a.pct}%` : `${a.pct}%`}</b>
                          )}
                        </div>

                        {a.n >= 2 && (
                          <div className="price-stats">
                            <div>
                              <span className="ps-label">Mín</span>
                              <span className="ps-val green">{currencyShort(a.min)}</span>
                            </div>
                            <div>
                              <span className="ps-label">Prom</span>
                              <span className="ps-val">{currencyShort(a.avg)}</span>
                            </div>
                            <div>
                              <span className="ps-label">Máx</span>
                              <span className="ps-val red">{currencyShort(a.max)}</span>
                            </div>
                          </div>
                        )}

                        <div className="price-history">
                          {[...a.pts].reverse().slice(0, 4).map((p) => {
                            const rc = rowClass(toCOP(p.price, p.currency, usdRate), a.avg)
                            return (
                            <div className={`ph-row ${rc}`} key={p.id}>
                              <span className="ph-date">{shortLabel(p.date)}</span>
                              {p.store && (
                                <span className="ph-store">
                                  <Store size={11} /> {p.store}
                                </span>
                              )}
                              <span className={`ph-price ${rc}`}>{money(p.price, p.currency)}</span>
                              <button className="icon-btn" style={{ width: 24, height: 24 }} onClick={() => removePricePoint(it.id, p.id)}>
                                <Trash2 size={12} />
                              </button>
                            </div>
                            )
                          })}
                        </div>
                      </>
                    )}

                    <button className="btn btn-sm price-add" onClick={() => openAddPrice(it.id)}>
                      <Plus size={14} /> Registrar precio
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Modal consumible */}
      <Modal open={supplyModal} onClose={() => setSupplyModal(false)} title="Nuevo consumible">
        <div className="field">
          <label>Ícono</label>
          <div className="emoji-pick">
            {SUPPLY_EMOJIS.map((e) => (
              <button key={e} className={sEmoji === e ? 'active' : ''} onClick={() => setSEmoji(e)}>
                {e}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label>Nombre</label>
          <input className="input" value={sName} onChange={(e) => setSName(e.target.value)} placeholder="Ej. Pasta de dientes" autoFocus />
        </div>
        <div className="row">
          <div className="field">
            <label>¿Cuántos días te dura?</label>
            <input className="input" type="number" value={sDuration} onChange={(e) => setSDuration(e.target.value)} placeholder="30" />
          </div>
          <div className="field">
            <label>Moneda del precio</label>
            <CurrencyToggle value={sCur} onChange={setSCur} />
          </div>
        </div>
        <div className="field">
          <label>Precio (opcional)</label>
          <input className="input" type="number" step={sCur === 'USD' ? '0.01' : '1'} value={sPrice} onChange={(e) => setSPrice(e.target.value)} placeholder={sCur === 'USD' ? '0.00' : '0'} />
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
          Si pones precio, al "Reabastecer" se registra el gasto automáticamente en la categoría Compras.
        </div>
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={saveSupply}>
          <Plus size={16} /> Agregar al inventario
        </button>
      </Modal>

      {/* Modal deseo */}
      <Modal open={wishModal} onClose={() => setWishModal(false)} title="Nuevo deseo">
        <div className="field">
          <label>Ícono</label>
          <div className="emoji-pick">
            {WISH_EMOJIS.map((e) => (
              <button key={e} className={wEmoji === e ? 'active' : ''} onClick={() => setWEmoji(e)}>
                {e}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label>¿Qué quieres?</label>
          <input className="input" value={wName} onChange={(e) => setWName(e.target.value)} placeholder="Ej. Audífonos con cancelación de ruido" autoFocus />
        </div>
        <div className="field">
          <label>Moneda</label>
          <CurrencyToggle value={wCur} onChange={setWCur} />
        </div>
        <div className="row">
          <div className="field">
            <label>Precio aprox.</label>
            <input className="input" type="number" step={wCur === 'USD' ? '0.01' : '1'} value={wPrice} onChange={(e) => setWPrice(e.target.value)} placeholder={wCur === 'USD' ? 'Ej. 90' : 'Ej. 350000'} />
            {wCur === 'USD' && wPrice && parseFloat(wPrice) > 0 && (
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>{copHint(parseFloat(wPrice), 'USD', usdRate)} hoy</div>
            )}
          </div>
          <div className="field">
            <label>¿Cuánto lo quieres?</label>
            <select className="select" value={wPriority} onChange={(e) => setWPriority(e.target.value as WishPriority)}>
              <option value="alta">🔥 Lo quiero ya</option>
              <option value="media">⭐ Me gustaría</option>
              <option value="baja">💤 Algún día</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label>Nota (opcional)</label>
          <input className="input" value={wNote} onChange={(e) => setWNote(e.target.value)} placeholder="Ej. modelo, dónde comprarlo, link..." />
        </div>
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={saveWish}>
          <Sparkles size={16} /> Añadir a mis deseos
        </button>
      </Modal>

      {/* Modal: seguir un producto (precios) */}
      <Modal open={priceItemModal} onClose={() => setPriceItemModal(false)} title="Seguir un producto">
        <div className="field">
          <label>Ícono</label>
          <div className="emoji-pick">
            {PRICE_EMOJIS.map((e) => (
              <button key={e} className={piEmoji === e ? 'active' : ''} onClick={() => setPiEmoji(e)}>
                {e}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label>Producto</label>
          <input className="input" value={piName} onChange={(e) => setPiName(e.target.value)} placeholder="Ej. Café molido 500g" autoFocus />
        </div>
        <div className="field">
          <label>Cantidad de referencia (opcional)</label>
          <input className="input" value={piUnit} onChange={(e) => setPiUnit(e.target.value)} placeholder="Ej. 500 g, 1 L, unidad..." />
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
          Registra el precio cada vez que lo veas y compararé si está barato o caro frente a tu historial.
        </div>
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={savePriceItem}>
          <Plus size={16} /> Empezar a seguirlo
        </button>
      </Modal>

      {/* Modal: registrar un precio */}
      <Modal open={ppItem !== null} onClose={() => setPpItem(null)} title={ppItemObj ? `Precio de ${ppItemObj.name}` : 'Registrar precio'}>
        <div className="field">
          <label>Moneda</label>
          <CurrencyToggle value={ppCur} onChange={setPpCur} />
        </div>
        <div className="row">
          <div className="field">
            <label>Precio</label>
            <input
              className="input"
              type="number"
              step={ppCur === 'USD' ? '0.01' : '1'}
              value={ppPrice}
              onChange={(e) => setPpPrice(e.target.value)}
              placeholder={ppCur === 'USD' ? '0.00' : '0'}
              autoFocus
            />
          </div>
          <div className="field">
            <label>Fecha</label>
            <input className="input" type="date" value={ppDate} onChange={(e) => setPpDate(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label>¿Dónde? (opcional)</label>
          <input className="input" value={ppStore} onChange={(e) => setPpStore(e.target.value)} placeholder="Ej. D1, Éxito, tienda del barrio..." />
        </div>
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={savePricePoint}>
          <Plus size={16} /> Guardar precio
        </button>
      </Modal>
    </>
  )
}
