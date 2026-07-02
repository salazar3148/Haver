import { Modal } from './ui'
import { useUi } from '../store/useUi'
import { THEMES } from '../store/themes'
import { Sparkles } from 'lucide-react'

const ACCENTS = ['#8b5cf6', '#22d3ee', '#34d399', '#fbbf24', '#fb7185', '#f0abfc', '#f97316', '#60a5fa']

export function ThemePicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { themeId, accent, effects, setTheme, setAccent, toggleEffects } = useUi()

  return (
    <Modal open={open} onClose={onClose} title="Personaliza tu experiencia">
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Tema
      </div>
      <div className="theme-grid">
        {THEMES.map((t) => (
          <button
            key={t.id}
            className={`theme-tile ${themeId === t.id ? 'active' : ''}`}
            onClick={() => setTheme(t.id)}
          >
            <div
              className="theme-preview"
              style={{ background: `linear-gradient(135deg, ${t.primary}, ${t.secondary})` }}
            />
            <div className="theme-name">
              {t.emoji} {t.name}
              {t.mode === 'light' && <span style={{ fontSize: 10, color: 'var(--muted)' }}>· claro</span>}
            </div>
          </button>
        ))}
      </div>

      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', margin: '6px 0 10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Color de acento
      </div>
      <div className="accent-swatches">
        <button
          className={`accent-swatch ${!accent ? 'active' : ''}`}
          onClick={() => setAccent(null)}
          style={{ background: 'var(--grad)', display: 'grid', placeItems: 'center' }}
          title="Automático (según el tema)"
        >
          <Sparkles size={15} color="#fff" />
        </button>
        {ACCENTS.map((c) => (
          <button
            key={c}
            className={`accent-swatch ${accent === c ? 'active' : ''}`}
            style={{ background: c, color: c }}
            onClick={() => setAccent(c)}
          />
        ))}
      </div>

      <div className="switch-row" style={{ marginTop: 18, borderTop: '1px solid var(--border)' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Efectos visuales</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            Aurora animada, confeti y transiciones
          </div>
        </div>
        <button
          className={`switch ${effects ? 'on' : ''}`}
          onClick={toggleEffects}
          aria-label="Alternar efectos"
        />
      </div>
    </Modal>
  )
}
