import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Wallet,
  Repeat,
  Target,
  Trophy,
  Timer,
  ListChecks,
  Palette,
  CalendarCheck,
  CalendarDays,
  BarChart3,
  Link2,
  Quote,
  Pin,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { useUi } from '../store/useUi'
import { getLevelInfo, rankName } from '../store/gamification'
import { Bar } from './ui'
import { SyncBadge } from './SyncBadge'

const groups = [
  {
    label: 'Principal',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/plan', label: 'Mi Día', icon: CalendarCheck },
      { to: '/calendario', label: 'Calendario', icon: CalendarDays },
    ],
  },
  {
    label: 'Hacer',
    items: [
      { to: '/enfoque', label: 'Enfoque', icon: Timer },
      { to: '/tareas', label: 'Tareas', icon: ListChecks },
      { to: '/habitos', label: 'Hábitos', icon: Repeat },
      { to: '/metas', label: 'Metas', icon: Target },
    ],
  },
  {
    label: 'Finanzas',
    items: [
      { to: '/finanzas', label: 'Finanzas', icon: Wallet },
      { to: '/estadisticas', label: 'Estadísticas', icon: BarChart3 },
    ],
  },
  {
    label: 'Extra',
    items: [
      { to: '/recursos', label: 'Recursos', icon: Link2 },
      { to: '/citas', label: 'Citas', icon: Quote },
      { to: '/tablero', label: 'Tablero', icon: Pin },
      { to: '/logros', label: 'Logros', icon: Trophy },
    ],
  },
]

export function Sidebar({ onOpenThemes }: { onOpenThemes: () => void }) {
  const xp = useStore((s) => s.game.xp)
  const info = getLevelInfo(xp)
  const collapsed = useUi((s) => s.sidebarCollapsed)
  const toggleSidebar = useUi((s) => s.toggleSidebar)

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      <button
        className="sidebar-collapse-btn"
        onClick={toggleSidebar}
        title={collapsed ? 'Expandir menú' : 'Contraer menú'}
      >
        {collapsed ? <ChevronsRight size={15} /> : <ChevronsLeft size={15} />}
      </button>

      <div className="brand">
        <div className="brand-logo">
          <img src="/haver.svg" alt="Haver" width={26} height={26} />
        </div>
        {!collapsed && (
          <div>
            <div className="brand-name">Haver</div>
            <div className="brand-sub">Sube de nivel tu vida</div>
          </div>
        )}
      </div>

      <div className="nav-scroll">
        {groups.map((group) => (
          <div className="nav-group" key={group.label}>
            {!collapsed && <div className="nav-label">{group.label}</div>}
            <nav className="nav">
              {group.items.map((it) => {
                const Icon = it.icon
                return (
                  <NavLink
                    key={it.to}
                    to={it.to}
                    end={it.end}
                    title={collapsed ? it.label : undefined}
                    className={({ isActive }) =>
                      'nav-item' + (isActive ? ' active' : '')
                    }
                  >
                    <Icon size={19} />
                    {!collapsed && <span>{it.label}</span>}
                  </NavLink>
                )
              })}
            </nav>
          </div>
        ))}
      </div>

      <div className="sidebar-foot">
        <SyncBadge collapsed={collapsed} />
        <button className="theme-btn" onClick={onOpenThemes} title="Personalizar tema">
          <span className="theme-dot" />
          {!collapsed && <span style={{ flex: 1, textAlign: 'left' }}>Personalizar tema</span>}
          <Palette size={16} />
        </button>
        <div className="mini-level">
          <div className="mini-badge">{info.level}</div>
          {!collapsed && (
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
          )}
        </div>
      </div>
    </aside>
  )
}
