import { useRef, useState, useEffect } from 'react'
import { StickyNote, FileText, ListChecks, Image as ImageIcon, Trash2, Pencil, Palette, Plus, X } from 'lucide-react'
import { useStore } from '../store/useStore'
import type { BoardNote, NoteKind } from '../store/types'
import { Empty } from '../components/ui'
import { XpWidget } from '../App'

const NOTE_COLORS = ['#ffe082', '#ff9db0', '#8fd0ff', '#a8e6a1', '#ffb877', '#d3b4ff']
const PHOTO_EMOJIS = ['📸', '🌅', '🏔️', '🎯', '💡', '❤️', '🔥', '⭐', '🎸', '🐉', '🌱', '🏆']

const KIND_META: Record<NoteKind, { label: string; icon: typeof StickyNote }> = {
  sticky: { label: 'Nota adhesiva', icon: StickyNote },
  paper: { label: 'Papel', icon: FileText },
  todo: { label: 'Pendientes', icon: ListChecks },
  photo: { label: 'Foto', icon: ImageIcon },
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
  const boardRef = useRef<HTMLDivElement>(null)

  const create = (kind: NoteKind) => {
    const board = boardRef.current
    const bw = board?.clientWidth ?? 800
    const bh = board?.clientHeight ?? 600
    const noteW = 180
    // Aparece cerca del centro con un pequeño desorden para que no se apilen exactas
    const jitter = () => (Math.random() - 0.5) * 120
    const x = Math.max(20, Math.min(bw - noteW - 20, bw / 2 - noteW / 2 + jitter()))
    const y = Math.max(20, Math.min(bh - 160, bh / 2 - 90 + jitter()))
    addNote(kind, x, y)
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Tablero</div>
          <div className="page-sub">
            Tu corcho personal: fija notas, pendientes y recuerdos. Arrastra para acomodarlos a tu gusto.
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
        <span className="board-hint">Doble clic en una nota para escribir · arrástrala para moverla</span>
      </div>

      <div className="cork-frame">
        <div className="corkboard" ref={boardRef}>
          {boardNotes.length === 0 && (
            <div className="board-empty">
              <Empty emoji="📌" text="Tu corcho está vacío. Fija tu primera nota arriba." />
            </div>
          )}
          {boardNotes.map((n) => (
            <NoteCard
              key={n.id}
              note={n}
              boardRef={boardRef}
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
      </div>
    </>
  )
}

function NoteCard({
  note,
  boardRef,
  onMove,
  onFront,
  onUpdate,
  onRemove,
  onAddItem,
  onToggleItem,
  onRemoveItem,
}: {
  note: BoardNote
  boardRef: React.RefObject<HTMLDivElement>
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
    // No arrastrar si se toca un control interactivo
    if ((e.target as HTMLElement).closest('.note-ui, textarea, input, .chk-row, button')) return
    e.preventDefault()
    onFront(note.id)
    const board = boardRef.current
    const el = ref.current
    if (!board || !el) return
    const bw = board.clientWidth
    const bh = board.clientHeight
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
      nx = Math.max(0, Math.min(bw - nw, origX + (ev.clientX - startX)))
      ny = Math.max(0, Math.min(bh - nh, origY + (ev.clientY - startY)))
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
          <button
            className="note-ui-btn"
            title="Color"
            onClick={() => setShowColors((v) => !v)}
          >
            <Palette size={13} />
          </button>
        )}
        <button className="note-ui-btn danger" title="Quitar" onClick={() => onRemove(note.id)}>
          <Trash2 size={13} />
        </button>
      </div>

      {showColors && (
        <div className="note-colors" onPointerDown={(e) => e.stopPropagation()}>
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
      )}

      {note.kind === 'photo' ? (
        <>
          <div className="photo-pic" onDoubleClick={(e) => { e.stopPropagation(); cycleEmoji() }} title="Doble clic: cambiar imagen">
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
              placeholder="Agregar…"
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
