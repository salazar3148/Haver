import { useEffect, useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { Sidebar } from './components/Sidebar'
import { AchievementToast } from './components/AchievementToast'
import { ThemePicker } from './components/ThemePicker'
import { Login } from './components/Login'
import { Bar } from './components/ui'
import { useStore } from './store/useStore'
import { useUi } from './store/useUi'
import { THEMES, applyTheme } from './store/themes'
import { getLevelInfo, rankName } from './store/gamification'
import { useCountUp } from './utils/fx'
import { supabase, supabaseEnabled } from './lib/supabase'
import { startSync, stopSync } from './store/useSync'
import { Dashboard } from './pages/Dashboard'
import { Finanzas } from './pages/Finanzas'
import { Habitos } from './pages/Habitos'
import { Metas } from './pages/Metas'
import { Logros } from './pages/Logros'
import { Enfoque } from './pages/Enfoque'
import { Tareas } from './pages/Tareas'
import { Plan } from './pages/Plan'
import { Calendario } from './pages/Calendario'
import { Estadisticas } from './pages/Estadisticas'
import { Recursos } from './pages/Recursos'
import { Citas } from './pages/Citas'

function XpWidget() {
  const xp = useStore((s) => s.game.xp)
  const info = getLevelInfo(xp)
  const animTotal = Math.round(useCountUp(info.totalXp))
  return (
    <div className="xp-widget">
      <div className="level-badge">{info.level}</div>
      <div className="level-meta">
        <div className="level-rank">{rankName(info.level)}</div>
        <div className="level-xp">
          {info.current} / {info.needed} XP · {animTotal} total
        </div>
        <Bar value={info.current} max={info.needed} />
      </div>
    </div>
  )
}

// Aplica el tema y los efectos según preferencias del usuario
function useThemeEffect() {
  const { themeId, accent, effects } = useUi()
  useEffect(() => {
    const theme = THEMES.find((t) => t.id === themeId) ?? THEMES[0]
    applyTheme(theme, accent ?? undefined)
  }, [themeId, accent])
  useEffect(() => {
    document.documentElement.dataset.reduce = effects ? 'false' : 'true'
  }, [effects])
}

// Glow que sigue el cursor sobre las tarjetas
function useSpotlight(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    let raf = 0
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const el = (e.target as HTMLElement)?.closest('.card') as HTMLElement | null
        if (!el) return
        const r = el.getBoundingClientRect()
        el.style.setProperty('--mx', `${e.clientX - r.left}px`)
        el.style.setProperty('--my', `${e.clientY - r.top}px`)
      })
    }
    window.addEventListener('mousemove', onMove)
    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [enabled])
}

export default function App() {
  const effects = useUi((s) => s.effects)
  const [picker, setPicker] = useState(false)
  useThemeEffect()
  useSpotlight(effects)

  // Sesión de Supabase (solo si la nube está configurada)
  const [session, setSession] = useState<Session | null | undefined>(
    supabaseEnabled ? undefined : null
  )
  useEffect(() => {
    if (!supabaseEnabled || !supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])
  useEffect(() => {
    if (!supabaseEnabled) return
    if (session?.user) startSync(session.user.id, session.user.email ?? null)
    else stopSync()
  }, [session])

  if (supabaseEnabled && session === undefined) {
    return <div className="auth-loading">Cargando…</div>
  }
  if (supabaseEnabled && !session) {
    return <Login />
  }

  return (
    <Shell picker={picker} setPicker={setPicker} effects={effects} />
  )
}

function Shell({ picker, setPicker, effects }: { picker: boolean; setPicker: (v: boolean) => void; effects: boolean }) {
  const location = useLocation()
  return (
    <div className="app">
      {effects && (
        <div className="aurora">
          <div className="aurora-3" />
        </div>
      )}
      <Sidebar onOpenThemes={() => setPicker(true)} />
      <main className="main">
        <div className="route-fade" key={location.pathname}>
          <Routes location={location}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/plan" element={<Plan />} />
            <Route path="/calendario" element={<Calendario />} />
            <Route path="/enfoque" element={<Enfoque />} />
            <Route path="/tareas" element={<Tareas />} />
            <Route path="/habitos" element={<Habitos />} />
            <Route path="/metas" element={<Metas />} />
            <Route path="/finanzas" element={<Finanzas />} />
            <Route path="/estadisticas" element={<Estadisticas />} />
            <Route path="/recursos" element={<Recursos />} />
            <Route path="/citas" element={<Citas />} />
            <Route path="/logros" element={<Logros />} />
          </Routes>
        </div>
      </main>
      <AchievementToast />
      <ThemePicker open={picker} onClose={() => setPicker(false)} />
    </div>
  )
}

export { XpWidget }
