import { useRef, useState, useEffect, useCallback } from 'react'
import {
  StickyNote,
  FileText,
  ListChecks,
  Image as ImageIcon,
  Trash2,
  Pencil,
  Palette,
  Plus,
  X,
  Sun,
  Moon,
  ZoomIn,
  ZoomOut,
  Maximize,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { useUi } from '../store/useUi'
import type { BoardNote, NoteKind } from '../store/types'
import { XpWidget } from '../App'

// Colores base: se ven pastel sobre el tablero día y como neón sobre el nocturno
const NOTE_COLORS = ['#ffd93d', '#ff5c8a', '#3ec9ff', '#4de08a', '#ff8a3d', '#b57bff']
const PHOTO_EMOJIS = ['📸', '🌅', '🏔️', '🎯', '💡', '❤️', '🔥', '⭐', '🎸', '🐉', '🌱', '🏆']

// Colores tomados del tema activo de la app (para que las notas "combinen"
// con el tema seleccionado). Se leen de las CSS vars en vivo.
function getThemeColors(): string[] {
  if (typeof window === 'undefined') return []
  const cs = getComputedStyle(document.documentElement)
  const raw = ['--primary', '--secondary', '--cyan']
    .map((v) => cs.getPropertyValue(v).trim())
    .filter(Boolean)
  return [...new Set(raw)]
}

const KIND_META: Record<NoteKind, { label: string; icon: typeof StickyNote }> = {
  sticky: { label: 'Nota', icon: StickyNote },
  paper: { label: 'Papel', icon: FileText },
  todo: { label: 'Checklist', icon: ListChecks },
  photo: { label: 'Foto', icon: ImageIcon },
}

// Lienzo grande y "extensible" que se recorre con paneo/zoom (tipo Excalidraw)
const CANVAS_W = 4000
const CANVAS_H = 3000
const MIN_ZOOM = 0.35
const MAX_ZOOM = 2.5
const clampZoom = (z: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z))

interface View {
  x: number
  y: number
  zoom: number
}

export function Tablero() {
  const boardNotes = useStore((s) => s.boardNotes)
  const {
    addNote,
    updateNote,
    moveNote,
    bringNoteToFront,
    removeNote,
    addNoteItem,
    toggleNoteItem,
    removeNoteItem,
  } = useStore()
  const boardTheme = useUi((s) => s.boardTheme)
  const setBoardTheme = useUi((s) => s.setBoardTheme)

  const viewportRef = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<View>({ x: 40, y: 40, zoom: 1 })

  // Punteros activos (para gestos táctiles: 1 dedo = paneo, 2 dedos = pinch-zoom)
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map())
  const panRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null)
  const pinchRef = useRef<{ dist: number; zoom: number; mx: number; my: number; ox: number; oy: number } | null>(null)

  const create = (kind: NoteKind) => {
    const vp = viewportRef.current
    const rect = vp?.getBoundingClientRect()
    const w = rect?.width ?? 800
    const h = rect?.height ?? 600
    // centro del viewport → coordenadas del lienzo, con leve desorden
    const jitter = () => (Math.random() - 0.5) * 90
    const cx = (w / 2 - view.x) / view.zoom - 90 + jitter()
    const cy = (h / 2 - view.y) / view.zoom - 70 + jitter()
    const x = Math.max(0, Math.min(CANVAS_W - 200, Math.round(cx)))
    const y = Math.max(0, Math.min(CANVAS_H - 160, Math.round(cy)))
    addNote(kind, x, y)
  }

  // ---- Paneo con 1 puntero / pinch con 2 ----
  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.note')) return
    const vp = viewportRef.current
    if (!vp) return
    vp.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 1) {
      panRef.current = { sx: e.clientX, sy: e.clientY, ox: view.x, oy: view.y }
      pinchRef.current = null
    } else if (pointers.current.size === 2) {
      const pts = [...pointers.current.values()]
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      const rect = vp.getBoundingClientRect()
      const mx = (pts[0].x + pts[1].x) / 2 - rect.left
      const my = (pts[0].y + pts[1].y) / 2 - rect.top
      pinchRef.current = { dist, zoom: view.zoom, mx, my, ox: view.x, oy: view.y }
      panRef.current = null
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pinchRef.current && pointers.current.size >= 2) {
      const pts = [...pointers.current.values()]
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      const ps = pinchRef.current
      const z = clampZoom(ps.zoom * (dist / (ps.dist || 1)))
      const canvasX = (ps.mx - ps.ox) / ps.zoom
      const canvasY = (ps.my - ps.oy) / ps.zoom
      setView({ x: ps.mx - canvasX * z, y: ps.my - canvasY * z, zoom: z })
    } else if (panRef.current) {
      const p = panRef.current
      setView((v) => ({ ...v, x: p.ox + (e.clientX - p.sx), y: p.oy + (e.clientY - p.sy) }))
    }
  }

  const endPointer = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinchRef.current = null
    if (pointers.current.size === 0) panRef.current = null
  }

  // ---- Zoom con rueda (desktop), centrado en el cursor ----
  const zoomAt = useCallback((mx: number, my: number, factor: number) => {
    setView((v) => {
      const z = clampZoom(v.zoom * factor)
      const canvasX = (mx - v.x) / v.zoom
      const canvasY = (my - v.y) / v.zoom
      return { x: mx - canvasX * z, y: my - canvasY * z, zoom: z }
    })
  }, [])

  useEffect(() => {
    const vp = viewportRef.current
    if (!vp) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = vp.getBoundingClientRect()
      if (e.ctrlKey || Math.abs(e.deltaY) > 0) {
        const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
        zoomAt(e.clientX - rect.left, e.clientY - rect.top, factor)
      }
    }
    vp.addEventListener('wheel', onWheel, { passive: false })
    return () => vp.removeEventListener('wheel', onWheel)
  }, [zoomAt])

  const zoomBtn = (dir: 1 | -1) => {
    const vp = viewportRef.current
    const rect = vp?.getBoundingClientRect()
    const mx = (rect?.width ?? 800) / 2
    const my = (rect?.height ?? 600) / 2
    zoomAt(mx, my, dir > 0 ? 1.2 : 1 / 1.2)
  }

  const resetView = () => setView({ x: 40, y: 40, zoom: 1 })

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Tablero</div>
          <div className="page-sub">
            Un lienzo infinito para tus notas y pendientes. Arrastra las notas, desplázate por el
            fondo y usa la rueda o dos dedos para acercar.
          </div>
        </div>
        <XpWidget />
      </div>

      <div className="board-toolbar">
        {(Object.keys(KIND_META) as NoteKind[]).map((k) => {
          const Icon = KIND_META[k].icon
          return (
            <button key={k} className="btn btn-ghost" onClick={() => create(k)}>
              <Icon size={16} /> {KIND_META[k].label}
            </button>
          )
        })}
        <div className="board-theme-toggle">
          <button
            className={boardTheme === 'light' ? 'active' : ''}
            onClick={() => setBoardTheme('light')}
            title="Modo día (blanco)"
          >
            <Sun size={15} /> Día
          </button>
          <button
            className={boardTheme === 'dark' ? 'active' : ''}
            onClick={() => setBoardTheme('dark')}
            title="Modo noche (negro)"
          >
            <Moon size={15} /> Noche
          </button>
        </div>
      </div>

      <div
        className="board-viewport"
        data-board={boardTheme}
        ref={viewportRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
      >
        <div
          className="board-canvas"
          style={{
            width: CANVAS_W,
            height: CANVAS_H,
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
          }}
        >
          {boardNotes.map((n) => (
            <NoteCard
              key={n.id}
              note={n}
              zoom={view.zoom}
              onMove={moveNote}
              onFront={bringNoteToFront}
              onUpdate={updateNote}
              onRemove={removeNote}
              onAddItem={addNoteItem}
              onToggleItem={toggleNoteItem}
              onRemoveItem={removeNoteItem}
            />
          ))}
        </div>

        {boardNotes.length === 0 && (
          <div className="board-empty">
            <div className="board-empty-emoji">🧲</div>
            <div className="board-empty-text">
              Tu tablero está vacío. Crea una nota con los botones de arriba.
            </div>
          </div>
        )}

        <div className="board-controls">
          <button onClick={() => zoomBtn(-1)} title="Alejar">
            <ZoomOut size={16} />
          </button>
          <button className="zoom-label" onClick={resetView} title="Restablecer vista">
            {Math.round(view.zoom * 100)}%
          </button>
          <button onClick={() => zoomBtn(1)} title="Acercar">
            <ZoomIn size={16} />
          </button>
          <button onClick={resetView} title="Centrar">
            <Maximize size={16} />
          </button>
        </div>
      </div>
    </>
  )
}

function NoteCard({
  note,
  zoom,
  onMove,
  onFront,
  onUpdate,
  onRemove,
  onAddItem,
  onToggleItem,
  onRemoveItem,
}: {
  note: BoardNote
  zoom: number
  onMove: (id: string, x: number, y: number) => void
  onFront: (id: string) => void
  onUpdate: (id: string, patch: Partial<BoardNote>) => void
  onRemove: (id: string) => void
  onAddItem: (id: string, text: string) => void
  onToggleItem: (id: string, itemId: string) => void
  onRemoveItem: (id: string, itemId: string) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const [editing, setEditing] = useState(false)
  const [showColors, setShowColors] = useState(false)
  const [draft, setDraft] = useState(note.text)
  const [newItem, setNewItem] = useState('')

  useEffect(() => setDraft(note.text), [note.text])

  const startDrag = (e: React.PointerEvent) => {
    // Evita que el gesto llegue al lienzo (paneo). Los controles internos no arrastran.
    e.stopPropagation()
    if ((e.target as HTMLElement).closest('.note-ui, textarea, input, .chk-row, .chk-add, button, .note-colors')) return
    e.preventDefault()
    onFront(note.id)
    const el = ref.current
    if (!el) return
    const nw = el.offsetWidth
    const nh = el.offsetHeight
    const startX = e.clientX
    const startY = e.clientY
    const origX = note.x
    const origY = note.y
    let nx = origX
    let ny = origY
    el.setPointerCapture(e.pointerId)
    setDragging(true)
    const move = (ev: PointerEvent) => {
      nx = Math.max(0, Math.min(CANVAS_W - nw, origX + (ev.clientX - startX) / zoom))
      ny = Math.max(0, Math.min(CANVAS_H - nh, origY + (ev.clientY - startY) / zoom))
      el.style.left = `${nx}px`
      el.style.top = `${ny}px`
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      setDragging(false)
      onMove(note.id, nx, ny)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const commitText = () => {
    setEditing(false)
    if (draft !== note.text) onUpdate(note.id, { text: draft })
  }

  const cycleEmoji = () => {
    const i = PHOTO_EMOJIS.indexOf(note.emoji)
    onUpdate(note.id, { emoji: PHOTO_EMOJIS[(i + 1) % PHOTO_EMOJIS.length] })
  }

  const placeholder =
    note.kind === 'photo' ? 'Escribe un pie…' : note.kind === 'todo' ? 'Título…' : 'Escribe aquí…'

  return (
    <div
      ref={ref}
      className={`note note-${note.kind}${dragging ? ' dragging' : ''}`}
      style={{
        left: note.x,
        top: note.y,
        zIndex: note.z,
        // @ts-expect-error CSS vars
        '--rot': `${note.rot}deg`,
        '--paper': note.color,
        '--pin': note.pin,
      }}
      onPointerDown={startDrag}
      onDoubleClick={() => note.kind !== 'todo' && setEditing(true)}
    >
      <span className="pin" />

      <div className="note-ui">
        {note.kind !== 'todo' && (
          <button className="note-ui-btn" title="Editar" onClick={() => setEditing(true)}>
            <Pencil size={13} />
          </button>
        )}
        {note.kind !== 'photo' && (
          <button className="note-ui-btn" title="Color" onClick={() => setShowColors((v) => !v)}>
            <Palette size={13} />
          </button>
        )}
        <button className="note-ui-btn danger" title="Quitar" onClick={() => onRemove(note.id)}>
          <Trash2 size={13} />
        </button>
      </div>

      {showColors && (
        <div className="note-colors" onPointerDown={(e) => e.stopPropagation()}>
          <div className="swatch-group-label">Tema</div>
          <div className="swatch-row">
            {getThemeColors().map((c, i) => (
              <button
                key={'t' + i}
                className="swatch theme"
                style={{ background: c }}
                title="Color de tu tema"
                onClick={() => {
                  onUpdate(note.id, { color: c })
                  setShowColors(false)
                }}
              />
            ))}
          </div>
          <div className="swatch-group-label">Colores</div>
          <div className="swatch-row">
            {NOTE_COLORS.map((c) => (
              <button
                key={c}
                className="swatch"
                style={{ background: c }}
                onClick={() => {
                  onUpdate(note.id, { color: c })
                  setShowColors(false)
                }}
              />
            ))}
          </div>
        </div>
      )}

      {note.kind === 'photo' ? (
        <>
          <div
            className="photo-pic"
            onDoubleClick={(e) => {
              e.stopPropagation()
              cycleEmoji()
            }}
            title="Doble clic: cambiar imagen"
          >
            <span>{note.emoji || '📸'}</span>
          </div>
          {editing ? (
            <textarea
              className="note-input photo-cap"
              autoFocus
              value={draft}
              placeholder={placeholder}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitText}
            />
          ) : (
            <div className="photo-cap-view" onDoubleClick={() => setEditing(true)}>
              {note.text || <span className="ph">Doble clic para el pie…</span>}
            </div>
          )}
        </>
      ) : note.kind === 'todo' ? (
        <div className="todo-body">
          {editing ? (
            <input
              className="note-input todo-title"
              autoFocus
              value={draft}
              placeholder="Título…"
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitText}
              onKeyDown={(e) => e.key === 'Enter' && commitText()}
            />
          ) : (
            <div className="todo-title-view" onDoubleClick={() => setEditing(true)}>
              {note.text || <span className="ph">Doble clic: título</span>}
            </div>
          )}
          <div className="chk-list">
            {note.items.map((it) => (
              <div className="chk-row" key={it.id}>
                <button
                  className={`chk${it.done ? ' on' : ''}`}
                  onClick={() => onToggleItem(note.id, it.id)}
                >
                  {it.done ? '✓' : ''}
                </button>
                <span className={it.done ? 'done' : ''}>{it.text}</span>
                <button className="chk-x" onClick={() => onRemoveItem(note.id, it.id)}>
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
          <div className="chk-add">
            <input
              value={newItem}
              placeholder="Agregar ítem…"
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newItem.trim()) {
                  onAddItem(note.id, newItem)
                  setNewItem('')
                }
              }}
            />
            <button
              onClick={() => {
                if (newItem.trim()) {
                  onAddItem(note.id, newItem)
                  setNewItem('')
                }
              }}
            >
              <Plus size={13} />
            </button>
          </div>
        </div>
      ) : editing ? (
        <textarea
          className="note-input"
          autoFocus
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitText}
        />
      ) : (
        <div className="note-text" onDoubleClick={() => setEditing(true)}>
          {note.text || <span className="ph">Doble clic para escribir…</span>}
        </div>
      )}
    </div>
  )
}
