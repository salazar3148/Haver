import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Wallet,
  Repeat,
  Target,
  Trophy,
  Timer,
  ListChecks,
  TrendingUp,
  Palette,
  CalendarCheck,
  CalendarDays,
  BarChart3,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { getLevelInfo, rankName } from '../store/gamification'
import { Bar } from './ui'
import { SyncBadge } from './SyncBadge'

const items = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/plan', label: 'Mi Día', icon: CalendarCheck },
  { to: '/calendario', label: 'Calendario', icon: CalendarDays },
  { to: '/enfoque', label: 'Enfoque', icon: Timer },
  { to: '/tareas', label: 'Tareas', icon: ListChecks },
  { to: '/habitos', label: 'Hábitos', icon: Repeat },
  { to: '/metas', label: 'Metas', icon: Target },
  { to: '/finanzas', label: 'Finanzas', icon: Wallet },
  { to: '/estadisticas', label: 'Estadísticas', icon: BarChart3 },
  { to: '/mejora', label: 'Mejora', icon: TrendingUp },
  { to: '/logros', label: 'Logros', icon: Trophy },
]

export function Sidebar({ onOpenThemes }: { onOpenThemes: () => void }) {
  const xp = useStore((s) => s.game.xp)
  const info = getLevelInfo(xp)

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-logo">⚔️</div>
        <div>
          <div className="brand-name">Vida Quest</div>
          <div className="brand-sub">Sube de nivel tu vida</div>
        </div>
      </div>

      <div className="nav-label">Menú</div>
      <nav className="nav">
        {items.map((it) => {
          const Icon = it.icon
          return (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              className={({ isActive }) =>
                'nav-item' + (isActive ? ' active' : '')
              }
            >
              <Icon size={19} />
              <span>{it.label}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className="sidebar-foot">
        <SyncBadge />
        <button className="theme-btn" onClick={onOpenThemes}>
          <span className="theme-dot" />
          <span style={{ flex: 1, textAlign: 'left' }}>Personalizar tema</span>
          <Palette size={16} />
        </button>
        <div className="mini-level">
          <div className="mini-badge">{info.level}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>
              {rankName(info.level)}
            </div>
            <div
              style={{
                fontSize: 10,
                color: 'var(--muted)',
                margin: '3px 0 5px',
              }}
            >
              {info.current}/{info.needed} XP
            </div>
            <Bar value={info.current} max={info.needed} />
          </div>
        </div>
      </div>
    </aside>
  )
}
