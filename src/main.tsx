import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { useUi } from './store/useUi'
import { THEMES, applyTheme } from './store/themes'
import './index.css'

// Aplica el tema guardado antes del primer render (evita parpadeo)
const ui = useUi.getState()
applyTheme(THEMES.find((t) => t.id === ui.themeId) ?? THEMES[0], ui.accent ?? undefined)
document.documentElement.dataset.reduce = ui.effects ? 'false' : 'true'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
)
