import { useMemo, useState } from 'react'
import { Plus, Trash2, ExternalLink, Link2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Modal, Empty } from '../components/ui'
import { XpWidget } from '../App'

const CATEGORY_COLORS: Record<string, string> = {
  Productividad: '#8b5cf6',
  Finanzas: '#34d399',
  Salud: '#fb7185',
  Estudio: '#fbbf24',
  General: '#22d3ee',
}
const colorFor = (cat: string) => CATEGORY_COLORS[cat] ?? '#9a9ab4'

const normalizeUrl = (raw: string) => {
  const v = raw.trim()
  if (!v) return v
  return /^https?:\/\//i.test(v) ? v : `https://${v}`
}

const hostnameOf = (url: string) => {
  try {
    return new URL(normalizeUrl(url)).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function Recursos() {
  const { resources, addResource, removeResource } = useStore()
  const [modal, setModal] = useState(false)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('General')

  const categories = useMemo(() => {
    const set = new Set<string>(['General', 'Productividad', 'Finanzas', 'Salud', 'Estudio'])
    resources.forEach((r) => set.add(r.category || 'General'))
    return [...set]
  }, [resources])

  const grouped = useMemo(() => {
    const map = new Map<string, typeof resources>()
    resources.forEach((r) => {
      const key = r.category || 'General'
      const arr = map.get(key) ?? []
      arr.push(r)
      map.set(key, arr)
    })
    return [...map.entries()]
  }, [resources])

  const save = () => {
    if (!title.trim() || !url.trim()) return
    addResource({
      title: title.trim(),
      url: normalizeUrl(url),
      description: description.trim(),
      category: category.trim() || 'General',
    })
    setTitle('')
    setUrl('')
    setDescription('')
    setCategory('General')
    setModal(false)
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Recursos</div>
          <div className="page-sub">
            Páginas web que aportan valor: guárdalas con una descripción de para qué sirven
          </div>
        </div>
        <XpWidget />
      </div>

      <div style={{ marginBottom: 18 }}>
        <button className="btn btn-primary" onClick={() => setModal(true)}>
          <Plus size={16} /> Nuevo recurso
        </button>
      </div>

      {resources.length === 0 ? (
        <div className="card">
          <Empty emoji="🔗" text="Guarda tu primera página web valiosa: una herramienta, un artículo, un curso." />
        </div>
      ) : (
        grouped.map(([cat, items]) => (
          <div key={cat} style={{ marginBottom: 22 }}>
            <div className="section-title">
              <span style={{ width: 9, height: 9, borderRadius: 99, background: colorFor(cat), display: 'inline-block' }} />
              {cat} · {items.length}
            </div>
            <div className="grid cols-2">
              {items.map((r) => (
                <div className="card" key={r.id} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div
                      className="habit-emoji"
                      style={{ background: `${colorFor(r.category)}22`, color: colorFor(r.category), width: 38, height: 38, fontSize: 17 }}
                    >
                      <Link2 size={17} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14.5 }}>{r.title}</div>
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: 12, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 4, wordBreak: 'break-all' }}
                      >
                        {hostnameOf(r.url)} <ExternalLink size={11} />
                      </a>
                    </div>
                    <button className="icon-btn danger" style={{ width: 30, height: 30 }} onClick={() => removeResource(r.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {r.description && (
                    <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{r.description}</div>
                  )}
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm" style={{ alignSelf: 'flex-start' }}>
                    <ExternalLink size={13} /> Visitar
                  </a>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Nuevo recurso">
        <div className="field">
          <label>Título</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. Notion, Investopedia, Todoist" autoFocus />
        </div>
        <div className="field">
          <label>URL</label>
          <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="ejemplo.com o https://ejemplo.com" />
        </div>
        <div className="field">
          <label>¿Para qué sirve? (descripción)</label>
          <input
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej. Calculadora de interés compuesto para planear ahorros"
          />
        </div>
        <div className="field">
          <label>Categoría</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            {categories.map((c) => (
              <button
                key={c}
                className="chip"
                style={{
                  cursor: 'pointer',
                  borderColor: category === c ? colorFor(c) : 'var(--border)',
                  color: category === c ? colorFor(c) : 'var(--muted)',
                  background: category === c ? `${colorFor(c)}1f` : 'var(--panel-2)',
                }}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <input className="input" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="O escribe una categoría nueva" />
        </div>
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={save}>
          <Plus size={16} /> Guardar recurso
        </button>
      </Modal>
    </>
  )
}
