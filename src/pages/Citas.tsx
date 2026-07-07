import { useMemo, useState } from 'react'
import { Plus, Trash2, Star, Quote as QuoteIcon } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Modal, Empty, Segmented } from '../components/ui'
import { XpWidget } from '../App'

export function Citas() {
  const { quotes, addQuote, toggleQuoteFavorite, removeQuote } = useStore()
  const [modal, setModal] = useState(false)
  const [filter, setFilter] = useState<'todas' | 'favoritas'>('todas')
  const [text, setText] = useState('')
  const [author, setAuthor] = useState('')

  const visible = filter === 'favoritas' ? quotes.filter((q) => q.favorite) : quotes

  // Cita destacada: una favorita al azar, o cualquiera si no hay favoritas, estable por día
  const featured = useMemo(() => {
    if (quotes.length === 0) return null
    const pool = quotes.filter((q) => q.favorite).length ? quotes.filter((q) => q.favorite) : quotes
    const dayIndex = Math.floor(Date.now() / 86400000)
    return pool[dayIndex % pool.length]
  }, [quotes])

  const save = () => {
    if (!text.trim()) return
    addQuote({ text: text.trim(), author: author.trim() })
    setText('')
    setAuthor('')
    setModal(false)
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Citas</div>
          <div className="page-sub">
            Guarda las frases que más te marcan, para inspirarte cuando más lo necesites
          </div>
        </div>
        <XpWidget />
      </div>

      {featured && (
        <div className="card" style={{ marginBottom: 18, background: 'var(--grad-soft)', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <QuoteIcon size={26} style={{ color: 'var(--violet)', flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: 6 }}>
              Cita del día
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.4, fontStyle: 'italic' }}>
              "{featured.text}"
            </div>
            {featured.author && (
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>— {featured.author}</div>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn btn-primary" onClick={() => setModal(true)}>
          <Plus size={16} /> Nueva cita
        </button>
        {quotes.length > 0 && (
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'todas', label: 'Todas' },
              { value: 'favoritas', label: '⭐ Favoritas' },
            ]}
          />
        )}
      </div>

      {quotes.length === 0 ? (
        <div className="card">
          <Empty emoji="💬" text="Guarda la primera frase que te marque de verdad." />
        </div>
      ) : visible.length === 0 ? (
        <div className="card">
          <Empty emoji="⭐" text="Aún no marcas ninguna como favorita." />
        </div>
      ) : (
        <div className="grid cols-2">
          {visible.map((q) => (
            <div className="card" key={q.id} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <QuoteIcon size={18} style={{ color: 'var(--violet)', flexShrink: 0, marginTop: 3 }} />
                <div style={{ flex: 1, minWidth: 0, fontSize: 14.5, lineHeight: 1.5, fontStyle: 'italic' }}>
                  "{q.text}"
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: q.author ? 'var(--text)' : 'var(--faint)' }}>
                  {q.author ? `— ${q.author}` : 'Autor desconocido'}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    className="icon-btn"
                    style={{ width: 32, height: 32, color: q.favorite ? '#fbbf24' : 'var(--muted)' }}
                    title="Marcar como favorita"
                    onClick={() => toggleQuoteFavorite(q.id)}
                  >
                    <Star size={16} fill={q.favorite ? '#fbbf24' : 'none'} />
                  </button>
                  <button className="icon-btn danger" style={{ width: 32, height: 32 }} onClick={() => removeQuote(q.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Nueva cita">
        <div className="field">
          <label>Frase</label>
          <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Ej. La disciplina es el puente entre metas y logros" autoFocus />
        </div>
        <div className="field">
          <label>Autor (opcional)</label>
          <input className="input" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Ej. Jim Rohn" />
        </div>
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={save}>
          <Plus size={16} /> Guardar cita
        </button>
      </Modal>
    </>
  )
}
