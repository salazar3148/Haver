import { useRef, useState, useEffect, useCallback } from 'react'
import {
  StickyNote,
  FileText,
  ListChecks,
  Image as ImageIcon,
  Square,
  Type,
  Smile,
  Tag,
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
const STICKER_EMOJIS = [
  '⭐', '✨', '🌟', '🔥', '❤️', '📌', '🧷', '📎', '🎯', '✅', '💡', '🚀',
  '🌸', '🍀', '☀️', '🌙', '⚡', '👑', '🎉', '🏷️', '💬', '🎗️', '🖇️', '🌈',
]

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
  text: { label: 'Texto', icon: Type },
  frame: { label: 'Cuadro', icon: Square },
  photo: { label: 'Foto', icon: ImageIcon },
  sticker: { label: 'Sticker', icon: Smile },
}
const TOOLBAR_KINDS: NoteKind[] = ['sticky', 'paper', 'todo', 'text', 'frame', 'photo', 'sticker']

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
  const [autoEditId, setAutoEditId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Punteros activos (para gestos táctiles: 1 dedo = paneo, 2 dedos = pinch-zoom)
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map())
  const panRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null)
  const pinchRef = useRef<{ dist: number; zoom: number; mx: number; my: number; ox: number; oy: number } | null>(null)

  // centro del viewport → coordenadas del lienzo
  const centerCanvas = (offX = 90, offY = 70) => {
    const rect = viewportRef.current?.getBoundingClientRect()
    const w = rect?.width ?? 800
    const h = rect?.height ?? 600
    const jitter = () => (Math.random() - 0.5) * 90
    return {
      x: Math.max(0, Math.min(CANVAS_W - 240, Math.round((w / 2 - view.x) / view.zoom - offX + jitter()))),
      y: Math.max(0, Math.min(CANVAS_H - 160, Math.round((h / 2 - view.y) / view.zoom - offY + jitter()))),
    }
  }

  const create = (kind: NoteKind) => {
    const { x, y } = centerCanvas()
    const id = addNote(kind, x, y)
    setSelectedId(id)
    if (kind === 'sticky' || kind === 'text') setAutoEditId(id)
  }

  // Tecla Suprimir/Delete: elimina el elemento seleccionado (si no estás escribiendo).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return
      const ae = document.activeElement as HTMLElement | null
      if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)) return
      if (selectedId) {
        removeNote(selectedId)
        setSelectedId(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId, removeNote])

  // ---- Paneo con 1 puntero / pinch con 2 ----
  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.note')) return
    setSelectedId(null)
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
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
      zoomAt(e.clientX - rect.left, e.clientY - rect.top, factor)
    }
    vp.addEventListener('wheel', onWheel, { passive: false })
    return () => vp.removeEventListener('wheel', onWheel)
  }, [zoomAt])

  const zoomBtn = (dir: 1 | -1) => {
    const rect = viewportRef.current?.getBoundingClientRect()
    zoomAt((rect?.width ?? 800) / 2, (rect?.height ?? 600) / 2, dir > 0 ? 1.2 : 1 / 1.2)
  }

  const resetView = () => setView({ x: 40, y: 40, zoom: 1 })

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Tablero</div>
          <div className="page-sub">
            Un lienzo infinito para tus notas, listas y recuerdos. Arrastra, redimensiona los
            cuadros y usa la rueda o dos dedos para acercar.
          </div>
        </div>
        <XpWidget />
      </div>

      <div className="board-toolbar">
        {TOOLBAR_KINDS.map((k) => {
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
              autoEdit={n.id === autoEditId}
              selected={n.id === selectedId}
              onSelect={setSelectedId}
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
              Tu tablero está vacío. Crea algo con los botones de arriba.
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
  autoEdit,
  selected,
  onSelect,
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
  autoEdit?: boolean
  selected?: boolean
  onSelect: (id: string) => void
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
  const [editing, setEditing] = useState(!!autoEdit)
  const [showColors, setShowColors] = useState(false)
  const [showEmojis, setShowEmojis] = useState(false)
  const [draft, setDraft] = useState(note.text)
  const [newItem, setNewItem] = useState('')

  useEffect(() => setDraft(note.text), [note.text])

  const startDrag = (e: React.PointerEvent) => {
    // Evita que el gesto llegue al lienzo (paneo). Los controles internos no arrastran.
    e.stopPropagation()
    if (
      (e.target as HTMLElement).closest(
        '.note-ui, textarea, input, .chk-row, .chk-add, button, .note-colors, .note-emojis, .resize-handle'
      )
    )
      return
    e.preventDefault()
    if (note.kind !== 'frame') onFront(note.id) // el cuadro se queda detrás
    onSelect(note.id)
    const downTarget = e.target as HTMLElement
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
    let moved = false
    el.setPointerCapture(e.pointerId)
    const move = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - startX, ev.clientY - startY) > 4) {
        moved = true
        setDragging(true)
      }
      if (!moved) return
      nx = Math.max(0, Math.min(CANVAS_W - nw, origX + (ev.clientX - startX) / zoom))
      ny = Math.max(0, Math.min(CANVAS_H - nh, origY + (ev.clientY - startY) / zoom))
      el.style.left = `${nx}px`
      el.style.top = `${ny}px`
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      if (moved) {
        setDragging(false)
        onMove(note.id, nx, ny)
      } else {
        handleClick(downTarget)
      }
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  // Un clic simple (sin arrastrar) permite escribir/editar directamente el elemento,
  // sin necesidad de doble clic.
  const handleClick = (target: HTMLElement) => {
    if (note.kind === 'sticker') {
      setShowEmojis((v) => !v)
    } else if (note.kind === 'photo') {
      if (target.closest('.photo-pic')) setShowEmojis(true)
      else setEditing(true)
    } else if (note.kind === 'frame') {
      if (note.showLabel !== false) setEditing(true) // solo edita si la etiqueta está activa
    } else if (note.kind !== 'todo') {
      setEditing(true)
    }
  }

  // Redimensionar (cuadro: ancho+alto / sticker: tamaño de fuente)
  const startResize = (e: React.PointerEvent) => {
    e.stopPropagation()
    e.preventDefault()
    onFront(note.id)
    const el = ref.current
    if (!el) return
    const isSticker = note.kind === 'sticker'
    const ow = note.w ?? el.offsetWidth
    const oh = note.h ?? el.offsetHeight
    const startX = e.clientX
    const startY = e.clientY
    let nw = ow
    let nh = oh
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    const move = (ev: PointerEvent) => {
      if (isSticker) {
        nw = Math.max(28, Math.min(260, ow + (ev.clientX - startX) / zoom))
        el.style.fontSize = `${nw}px`
      } else {
        nw = Math.max(120, Math.min(1400, ow + (ev.clientX - startX) / zoom))
        nh = Math.max(80, Math.min(1000, oh + (ev.clientY - startY) / zoom))
        el.style.width = `${nw}px`
        el.style.height = `${nh}px`
      }
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      onUpdate(note.id, isSticker ? { w: Math.round(nw) } : { w: Math.round(nw), h: Math.round(nh) })
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const commitText = () => {
    setEditing(false)
    if (draft !== note.text) onUpdate(note.id, { text: draft })
  }

  // Escape sale de la edición (sin borrar), dejando el elemento seleccionado
  // para poder eliminarlo con Supr si se desea.
  const onEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') (e.target as HTMLElement).blur()
  }

  const placeholder =
    note.kind === 'photo' ? 'Escribe un pie…' : note.kind === 'frame' ? 'Etiqueta…' : 'Escribe aquí…'

  const showPin = note.kind === 'paper' || note.kind === 'todo' || note.kind === 'photo'
  const canColor = note.kind !== 'photo' && note.kind !== 'sticker'
  const canResize = note.kind === 'frame' || note.kind === 'sticker'

  // Estilo dinámico (posición, apilamiento, tamaño, color propio)
  const style: React.CSSProperties = {
    left: note.x,
    top: note.y,
    zIndex: note.z,
    // @ts-expect-error CSS vars
    '--rot': `${note.rot}deg`,
    '--paper': note.color || '#8fd0ff',
    '--pin': note.pin,
  }
  if (note.kind === 'frame') {
    style.width = note.w ?? 300
    style.height = note.h ?? 200
  }
  if (note.kind === 'sticker') style.fontSize = `${note.w ?? 76}px`
  if (note.kind === 'text' && note.color) style.color = note.color

  return (
    <div
      ref={ref}
      className={`note note-${note.kind}${dragging ? ' dragging' : ''}${selected ? ' selected' : ''}`}
      style={style}
      onPointerDown={startDrag}
    >
      {showPin && <span className="pin" />}

      <div className="note-ui">
        {note.kind === 'sticker' ? (
          <button className="note-ui-btn" title="Cambiar emoji" onClick={() => setShowEmojis((v) => !v)}>
            <Smile size={13} />
          </button>
        ) : note.kind === 'frame' ? (
          <button
            className={`note-ui-btn${note.showLabel === false ? '' : ' on'}`}
            title={note.showLabel === false ? 'Mostrar etiqueta' : 'Ocultar etiqueta'}
            onClick={() => {
              const turningOn = note.showLabel === false
              onUpdate(note.id, { showLabel: turningOn })
              if (turningOn) setEditing(true)
            }}
          >
            <Tag size={13} />
          </button>
        ) : note.kind !== 'todo' ? (
          <button className="note-ui-btn" title="Editar" onClick={() => setEditing(true)}>
            <Pencil size={13} />
          </button>
        ) : null}
        {canColor && (
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
                style={{ ['--sw' as string]: c } as React.CSSProperties}
                onClick={() => {
                  onUpdate(note.id, { color: c })
                  setShowColors(false)
                }}
              />
            ))}
          </div>
        </div>
      )}

      {showEmojis && (
        <div className="note-emojis" onPointerDown={(e) => e.stopPropagation()}>
          {(note.kind === 'photo' ? PHOTO_EMOJIS : STICKER_EMOJIS).map((em) => (
            <button
              key={em}
              onClick={() => {
                onUpdate(note.id, { emoji: em })
                setShowEmojis(false)
              }}
            >
              {em}
            </button>
          ))}
        </div>
      )}

      {renderBody()}

      {canResize && <span className="resize-handle" onPointerDown={startResize} />}
    </div>
  )

  function renderBody() {
    switch (note.kind) {
      case 'sticker':
        return <div className="sticker-emoji">{note.emoji || '⭐'}</div>

      case 'text':
        return editing ? (
          <textarea
            className="note-input text-input"
            autoFocus
            value={draft}
            placeholder="Escribe…"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitText}
            onKeyDown={onEditKeyDown}
          />
        ) : (
          <div className="text-view">
            {note.text || <span className="ph">Clic para escribir…</span>}
          </div>
        )

      case 'frame': {
        // La etiqueta es opcional: si está desactivada, el cuadro va solo.
        if (note.showLabel === false) return null
        if (editing) {
          return (
            <div className="frame-bar">
              <input
                className="note-input frame-label"
                autoFocus
                value={draft}
                placeholder="Etiqueta…"
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitText}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitText()
                  else onEditKeyDown(e)
                }}
              />
            </div>
          )
        }
        if (note.text) {
          return (
            <div className="frame-bar" title="Clic para renombrar">
              <span className="frame-label-view">{note.text}</span>
            </div>
          )
        }
        // Etiqueta activa pero vacía: solo se insinúa cuando el cuadro está seleccionado
        if (selected) {
          return (
            <div className="frame-bar" title="Clic para nombrar">
              <span className="frame-label-view ph">Etiqueta…</span>
            </div>
          )
        }
        return null
      }

      case 'photo':
        return (
          <>
            <div className="photo-pic" title="Clic: cambiar imagen">
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
                onKeyDown={onEditKeyDown}
              />
            ) : (
              <div className="photo-cap-view">
                {note.text || <span className="ph">Clic para el pie…</span>}
              </div>
            )}
          </>
        )

      case 'todo':
        return (
          <div className="todo-body">
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
            {note.items.length === 0 && !selected && (
              <div className="chk-hint">Lista vacía · clic para agregar</div>
            )}
            {selected && (
              <div className="chk-add">
                <input
                  value={newItem}
                  placeholder="Agregar ítem…"
                  autoFocus={note.items.length === 0}
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newItem.trim()) {
                      onAddItem(note.id, newItem)
                      setNewItem('')
                    } else if (e.key === 'Escape') {
                      ;(e.target as HTMLElement).blur()
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
            )}
          </div>
        )

      default:
        // sticky y paper
        return editing ? (
          <textarea
            className="note-input"
            autoFocus
            value={draft}
            placeholder={placeholder}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitText}
            onKeyDown={onEditKeyDown}
          />
        ) : (
          <div className="note-text">
            {note.text || <span className="ph">Clic para escribir…</span>}
          </div>
        )
    }
  }
}
