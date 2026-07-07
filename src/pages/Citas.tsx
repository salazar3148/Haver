import { useMemo, useState } from 'react'
import { Plus, Trash2, Star, Quote as QuoteIcon, Sparkles } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Modal, Empty, Segmented } from '../components/ui'
import { XpWidget } from '../App'

const TAG_COLORS: Record<string, string> = {
  Disciplina: '#f5291f',
  Estoicismo: '#9a9ab4',
  Éxito: '#fbbf24',
  Motivación: '#fb7185',
  Sabiduría: '#8b5cf6',
  Perseverancia: '#22d3ee',
  General: '#34d399',
}
const colorFor = (tag: string) => TAG_COLORS[tag] ?? '#9a9ab4'

// Banco de citas sugeridas para arrancar rápido (no se guardan hasta tocarlas).
const SUGGESTED: { text: string; author: string; tag: string }[] = [
  { text: 'No cuentes los días, haz que los días cuenten.', author: 'Muhammad Ali', tag: 'Motivación' },
  { text: 'Somos lo que hacemos repetidamente. La excelencia, entonces, no es un acto, sino un hábito.', author: 'Aristóteles', tag: 'Disciplina' },
  { text: 'No es que tengamos poco tiempo, sino que perdemos mucho.', author: 'Séneca', tag: 'Estoicismo' },
  { text: 'El que tiene un porqué para vivir puede soportar casi cualquier cómo.', author: 'Friedrich Nietzsche', tag: 'Perseverancia' },
  { text: 'La disciplina es elegir entre lo que quieres ahora y lo que quieres más.', author: 'Abraham Lincoln', tag: 'Disciplina' },
  { text: 'No busques que las cosas ocurran como deseas, sino desea que ocurran como ocurren.', author: 'Epicteto', tag: 'Estoicismo' },
  { text: 'El éxito es la suma de pequeños esfuerzos repetidos día tras día.', author: 'Robert Collier', tag: 'Éxito' },
  { text: 'Cae siete veces, levántate ocho.', author: 'Proverbio japonés', tag: 'Perseverancia' },
]

export function Citas() {
  const { quotes, addQuote, toggleQuoteFavorite, removeQuote } = useStore()
  const [modal, setModal] = useState(false)
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [filter, setFilter] = useState<'todas' | 'favoritas'>('todas')
  const [text, setText] = useState('')
  const [author, setAuthor] = useState('')
  const [tag, setTag] = useState('General')

  const tags = useMemo(() => {
    const set = new Set<string>(['General', 'Disciplina', 'Estoicismo', 'Éxito', 'Motivación', 'Sabiduría', 'Perseverancia'])
    quotes.forEach((q) => set.add(q.tag || 'General'))
    return [...set]
  }, [quotes])

  const visible = filter === 'favoritas' ? quotes.filter((q) => q.favorite) : quotes

  // Cita destacada: una favorita al azar, o cualquiera si no hay favoritas, estable por día
  const featured = useMemo(() => {
    if (quotes.length === 0) return null
    const pool = quotes.filter((q) => q.favorite).length ? quotes.filter((q) => q.favorite) : quotes
    const dayIndex = Math.floor(Date.now() / 86400000)
    return pool[dayIndex % pool.length]
  }, [quotes])

  const save = () => {
    if (!text.trim() || !author.trim()) return
    addQuote({ text: text.trim(), author: author.trim(), tag: tag.trim() || 'General' })
    setText('')
    setAuthor('')
    setTag('General')
    setModal(false)
  }

  const quickAdd = (s: { text: string; author: string; tag: string }) => {
    if (quotes.some((q) => q.text === s.text && q.author === s.author)) return
    addQuote(s)
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Citas</div>
          <div className="page-sub">
            Guarda frases célebres para inspirarte cuando más lo necesites
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
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>— {featured.author}</div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn btn-primary" onClick={() => setModal(true)}>
          <Plus size={16} /> Nueva cita
        </button>
        <button className="btn" onClick={() => setSuggestOpen(true)}>
          <Sparkles size={16} /> Sugeridas
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
          <Empty emoji="💬" text="Guarda tu primera cita célebre, o elige alguna de las sugeridas." />
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
                <QuoteIcon size={18} style={{ color: colorFor(q.tag), flexShrink: 0, marginTop: 3 }} />
                <div style={{ flex: 1, minWidth: 0, fontSize: 14.5, lineHeight: 1.5, fontStyle: 'italic' }}>
                  "{q.text}"
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>— {q.author}</div>
                  <span className="chip" style={{ borderColor: colorFor(q.tag), color: colorFor(q.tag), marginTop: 4, display: 'inline-block' }}>
                    {q.tag}
                  </span>
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
          <label>Autor</label>
          <input className="input" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Ej. Jim Rohn" />
        </div>
        <div className="field">
          <label>Categoría</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            {tags.map((t) => (
              <button
                key={t}
                className="chip"
                style={{
                  cursor: 'pointer',
                  borderColor: tag === t ? colorFor(t) : 'var(--border)',
                  color: tag === t ? colorFor(t) : 'var(--muted)',
                  background: tag === t ? `${colorFor(t)}1f` : 'var(--panel-2)',
                }}
                onClick={() => setTag(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <input className="input" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="O escribe una categoría nueva" />
        </div>
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={save}>
          <Plus size={16} /> Guardar cita
        </button>
      </Modal>

      <Modal open={suggestOpen} onClose={() => setSuggestOpen(false)} title="Citas sugeridas">
        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 14 }}>
          Toca "+" para agregarla a tu colección.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {SUGGESTED.map((s) => {
            const already = quotes.some((q) => q.text === s.text && q.author === s.author)
            return (
              <div key={s.text} className="day-meet" style={{ alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontStyle: 'italic', lineHeight: 1.4 }}>"{s.text}"</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>— {s.author} · {s.tag}</div>
                </div>
                <button
                  className="icon-btn"
                  style={{ width: 30, height: 30, color: already ? 'var(--emerald)' : 'var(--muted)', flexShrink: 0 }}
                  disabled={already}
                  onClick={() => quickAdd(s)}
                >
                  {already ? '✓' : <Plus size={15} />}
                </button>
              </div>
            )
          })}
        </div>
      </Modal>
    </>
  )
}
