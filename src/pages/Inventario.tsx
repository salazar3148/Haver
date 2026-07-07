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
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { Modal, Empty, Segmented } from '../components/ui'
import { XpWidget } from '../App'
import { currency, currencyShort } from '../utils/format'
import { addDays, daysUntil } from '../utils/date'
import type { WishPriority } from '../store/types'

type Tab = 'consumibles' | 'compras' | 'deseos'

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
  } = useStore()

  const [tab, setTab] = useState<Tab>('consumibles')

  // Consumible
  const [supplyModal, setSupplyModal] = useState(false)
  const [sName, setSName] = useState('')
  const [sEmoji, setSEmoji] = useState('🧴')
  const [sDuration, setSDuration] = useState('30')
  const [sPrice, setSPrice] = useState('')

  // Compras
  const [shopInput, setShopInput] = useState('')

  // Deseo
  const [wishModal, setWishModal] = useState(false)
  const [wName, setWName] = useState('')
  const [wEmoji, setWEmoji] = useState('🎁')
  const [wPrice, setWPrice] = useState('')
  const [wPriority, setWPriority] = useState<WishPriority>('media')
  const [wNote, setWNote] = useState('')

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
  const wishTotal = wishlist.reduce((a, w) => a + (w.price || 0), 0)
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
    })
    setSName('')
    setSEmoji('🧴')
    setSDuration('30')
    setSPrice('')
    setSupplyModal(false)
  }

  const saveWish = () => {
    if (!wName.trim()) return
    addWish({
      name: wName.trim(),
      emoji: wEmoji || '🎁',
      price: parseFloat(wPrice) || 0,
      note: wNote.trim(),
      priority: wPriority,
    })
    setWName('')
    setWEmoji('🎁')
    setWPrice('')
    setWNote('')
    setWPriority('media')
    setWishModal(false)
  }

  const addShop = () => {
    if (!shopInput.trim()) return
    addShoppingItem(shopInput)
    setShopInput('')
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Inventario</div>
          <div className="page-sub">Tus consumibles, tu lista de compras y tus deseos, todo en un solo cofre</div>
        </div>
        <XpWidget />
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
                          dura ~{s.durationDays}d{s.price > 0 ? ` · ${currency(s.price)}` : ''}
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
                    <div className="wish-price">{w.price > 0 ? currency(w.price) : 'Sin precio'}</div>
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
            <label>Precio (opcional)</label>
            <input className="input" type="number" value={sPrice} onChange={(e) => setSPrice(e.target.value)} placeholder="0" />
          </div>
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
        <div className="row">
          <div className="field">
            <label>Precio aprox.</label>
            <input className="input" type="number" value={wPrice} onChange={(e) => setWPrice(e.target.value)} placeholder="Ej. 350000" />
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
    </>
  )
}
