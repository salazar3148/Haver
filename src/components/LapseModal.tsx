import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Modal } from './ui'
import { LAPSE_AREAS } from '../store/lapses'
import { todayISO } from '../utils/date'
import type { LapseArea } from '../store/types'

// Modal reutilizable para registrar un tropiezo/falla.
// Se usa desde Hábitos (y donde haga falta) en lugar de una página dedicada.
export function LapseModal({
  open,
  onClose,
  defaultArea = 'habito',
}: {
  open: boolean
  onClose: () => void
  defaultArea?: LapseArea
}) {
  const addLapse = useStore((s) => s.addLapse)
  const [area, setArea] = useState<LapseArea>(defaultArea)
  const [trigger, setTrigger] = useState('')
  const [note, setNote] = useState('')

  const save = () => {
    addLapse({
      area,
      trigger: trigger.trim() || 'Sin especificar',
      note: note.trim(),
      date: todayISO(),
      hour: new Date().getHours(),
    })
    setTrigger('')
    setNote('')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Registrar tropiezo">
      <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.6 }}>
        Anota una falla sin juzgarte. Verlo en tu calendario te ayuda a detectar patrones y mejorar.
      </div>
      <div className="field">
        <label>¿En qué área fallaste?</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {LAPSE_AREAS.map((a) => {
            const on = area === a.value
            return (
              <button
                key={a.value}
                className="chip"
                style={{
                  cursor: 'pointer',
                  borderColor: on ? a.color : 'var(--border)',
                  color: on ? a.color : 'var(--muted)',
                  background: on ? `${a.color}1f` : 'var(--panel-2)',
                }}
                onClick={() => setArea(a.value)}
              >
                {a.emoji} {a.label}
              </button>
            )
          })}
        </div>
      </div>
      <div className="field">
        <label>¿Qué lo detonó?</label>
        <input className="input" value={trigger} onChange={(e) => setTrigger(e.target.value)} placeholder="Ej. Redes sociales, cansancio, ansiedad" autoFocus />
      </div>
      <div className="field">
        <label>Nota (opcional)</label>
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="¿Qué harás diferente la próxima vez?" />
      </div>
      <button className="btn btn-primary" style={{ width: '100%' }} onClick={save}>
        <Plus size={16} /> Guardar tropiezo
      </button>
    </Modal>
  )
}
