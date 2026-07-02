import { type ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'
import { clamp } from '../utils/format'

// ===== Modal =====
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    if (open) window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">{title}</div>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ===== Progress bar =====
export function Bar({
  value,
  max,
  color,
}: {
  value: number
  max: number
  color?: 'green' | 'amber' | 'pink'
}) {
  const pct = max > 0 ? clamp((value / max) * 100) : 0
  return (
    <div className="bar">
      <div
        className={`bar-fill ${color ?? ''}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// ===== Stat card =====
export function Stat({
  label,
  value,
  icon,
  color,
  sub,
}: {
  label: string
  value: string
  icon: ReactNode
  color: string
  sub?: string
}) {
  return (
    <div className="card stat" style={{ ['--accent' as string]: color }}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
      <div
        className="stat-icon"
        style={{ background: `${color}22`, color }}
      >
        {icon}
      </div>
    </div>
  )
}

// ===== Empty state =====
export function Empty({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="empty">
      <div className="empty-emoji">{emoji}</div>
      <div className="empty-text">{text}</div>
    </div>
  )
}

// ===== Segmented control =====
export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div className="segmented">
      {options.map((o) => (
        <button
          key={o.value}
          className={value === o.value ? 'active' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
