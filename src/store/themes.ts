// Sistema de temas parametrizable.
// Cada tema define una paleta; la función applyTheme escribe las variables CSS.

export interface Theme {
  id: string
  name: string
  emoji: string
  mode: 'dark' | 'light'
  primary: string
  secondary: string
  bg: string
  bg2: string
  glow1: string
  glow2: string
  // Solo para modo claro (overrides de base):
  text?: string
  muted?: string
  faint?: string
  panel?: string
  panel2?: string
  panelHover?: string
  border?: string
  borderStrong?: string
}

export const THEMES: Theme[] = [
  {
    id: 'cueva',
    name: 'Cueva',
    emoji: '🕳️',
    mode: 'dark',
    primary: '#f5291f',
    secondary: '#7a0f0f',
    bg: '#08080a',
    bg2: '#131315',
    glow1: 'rgba(245,41,31,0.28)',
    glow2: 'rgba(110,12,12,0.26)',
    text: '#eae7e8',
    muted: '#9c9398',
    faint: '#5e575b',
    panel: 'rgba(255,255,255,0.026)',
    panel2: 'rgba(255,255,255,0.05)',
    panelHover: 'rgba(245,41,31,0.1)',
    border: 'rgba(255,255,255,0.065)',
    borderStrong: 'rgba(245,41,31,0.45)',
  },
  {
    id: 'cosmos',
    name: 'Cosmos',
    emoji: '🌌',
    mode: 'dark',
    primary: '#8b5cf6',
    secondary: '#22d3ee',
    bg: '#070710',
    bg2: '#0e0e1b',
    glow1: 'rgba(139,92,246,0.22)',
    glow2: 'rgba(34,211,238,0.16)',
  },
  {
    id: 'sunset',
    name: 'Atardecer',
    emoji: '🌅',
    mode: 'dark',
    primary: '#fb7185',
    secondary: '#fbbf24',
    bg: '#120a0f',
    bg2: '#1b0f16',
    glow1: 'rgba(251,113,133,0.22)',
    glow2: 'rgba(251,191,36,0.16)',
  },
  {
    id: 'emerald',
    name: 'Bosque',
    emoji: '🌿',
    mode: 'dark',
    primary: '#34d399',
    secondary: '#22d3ee',
    bg: '#06110d',
    bg2: '#0a1a15',
    glow1: 'rgba(52,211,153,0.2)',
    glow2: 'rgba(34,211,238,0.14)',
  },
  {
    id: 'cyberpunk',
    name: 'Neón',
    emoji: '⚡',
    mode: 'dark',
    primary: '#f0abfc',
    secondary: '#22d3ee',
    bg: '#0a0612',
    bg2: '#140a1f',
    glow1: 'rgba(240,171,252,0.24)',
    glow2: 'rgba(34,211,238,0.2)',
  },
  {
    id: 'gold',
    name: 'Real',
    emoji: '👑',
    mode: 'dark',
    primary: '#fbbf24',
    secondary: '#f97316',
    bg: '#100c05',
    bg2: '#1a1409',
    glow1: 'rgba(251,191,36,0.2)',
    glow2: 'rgba(249,115,22,0.16)',
  },
  {
    id: 'aurora',
    name: 'Aurora',
    emoji: '☀️',
    mode: 'light',
    primary: '#7c3aed',
    secondary: '#0891b2',
    bg: '#eef1f8',
    bg2: '#ffffff',
    glow1: 'rgba(124,58,237,0.16)',
    glow2: 'rgba(8,145,178,0.12)',
    text: '#171727',
    muted: '#5b5b73',
    faint: '#9292a8',
    panel: 'rgba(255,255,255,0.72)',
    panel2: 'rgba(17,17,30,0.04)',
    panelHover: 'rgba(17,17,30,0.07)',
    border: 'rgba(17,17,30,0.1)',
    borderStrong: 'rgba(17,17,30,0.2)',
  },
]

const clampCh = (v: number) => Math.max(0, Math.min(255, Math.round(v)))

const shade = (hex: string, amt = 0.18) => {
  const n = parseInt(hex.slice(1), 16)
  const r = clampCh(((n >> 16) & 255) * (1 - amt))
  const g = clampCh(((n >> 8) & 255) * (1 - amt))
  const b = clampCh((n & 255) * (1 - amt))
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

export const applyTheme = (theme: Theme, accent?: string) => {
  const root = document.documentElement
  const primary = accent || theme.primary
  const secondary = theme.secondary
  const s = (k: string, v: string) => root.style.setProperty(k, v)

  s('--violet', primary)
  s('--violet-d', shade(primary, 0.18))
  s('--cyan', secondary)
  s('--primary', primary)
  s('--primary-2', secondary)
  s('--bg', theme.bg)
  s('--bg-2', theme.bg2)
  s('--bg-glow-1', theme.glow1)
  s('--bg-glow-2', theme.glow2)
  s('--grad', `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`)
  s('--grad-soft', `linear-gradient(135deg, ${primary}22, ${secondary}14)`)
  s('--shadow-glow', `0 10px 36px -10px ${primary}80`)

  // Tokens de base (para modo claro)
  const baseKeys: [keyof Theme, string][] = [
    ['text', '--text'],
    ['muted', '--muted'],
    ['faint', '--faint'],
    ['panel', '--panel'],
    ['panel2', '--panel-2'],
    ['panelHover', '--panel-hover'],
    ['border', '--border'],
    ['borderStrong', '--border-strong'],
  ]
  // Reset a oscuro por defecto
  const darkDefaults: Record<string, string> = {
    '--text': '#edecf7',
    '--muted': '#9a9ab4',
    '--faint': '#6b6b85',
    '--panel': 'rgba(255,255,255,0.035)',
    '--panel-2': 'rgba(255,255,255,0.06)',
    '--panel-hover': 'rgba(255,255,255,0.08)',
    '--border': 'rgba(255,255,255,0.08)',
    '--border-strong': 'rgba(255,255,255,0.16)',
  }
  baseKeys.forEach(([key, cssVar]) => {
    const val = theme[key] as string | undefined
    s(cssVar, val ?? darkDefaults[cssVar])
  })
  root.dataset.mode = theme.mode
  root.dataset.theme = theme.id
}
