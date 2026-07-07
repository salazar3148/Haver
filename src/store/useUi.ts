import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UiState {
  themeId: string
  accent: string | null // acento personalizado (override del tema)
  effects: boolean // animaciones/efectos visuales
  focusMin: number // duración de enfoque preferida
  breakMin: number // duración de descanso preferida
  boardTheme: 'light' | 'dark' // tema del Tablero: día (blanco) / noche (negro)
  sidebarCollapsed: boolean // barra lateral deslizable/colapsada (solo íconos)
  usdRate: number // tasa de cambio del día: cuántos COP vale 1 USD
  setUsdRate: (n: number) => void
  setTheme: (id: string) => void
  setAccent: (color: string | null) => void
  toggleEffects: () => void
  setFocusMin: (n: number) => void
  setBreakMin: (n: number) => void
  setBoardTheme: (t: 'light' | 'dark') => void
  toggleSidebar: () => void
}

export const useUi = create<UiState>()(
  persist(
    (set) => ({
      themeId: 'cueva',
      accent: null,
      effects: true,
      focusMin: 25,
      breakMin: 5,
      boardTheme: 'light',
      sidebarCollapsed: false,
      usdRate: 4000,
      setUsdRate: (n) => set({ usdRate: n > 0 ? n : 1 }),
      setTheme: (id) => set({ themeId: id }),
      setAccent: (color) => set({ accent: color }),
      toggleEffects: () => set((s) => ({ effects: !s.effects })),
      setFocusMin: (n) => set({ focusMin: n }),
      setBreakMin: (n) => set({ breakMin: n }),
      setBoardTheme: (t) => set({ boardTheme: t }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    {
      name: 'vida-quest-ui',
      version: 4,
      migrate: (persisted: any, version: number) => {
        if (version < 1 && persisted) {
          persisted = { ...persisted, themeId: 'cueva', accent: null }
        }
        if (version < 2 && persisted) {
          persisted = { boardTheme: 'light', ...persisted }
        }
        if (version < 3 && persisted) {
          persisted = { sidebarCollapsed: false, ...persisted }
        }
        if (version < 4 && persisted) {
          persisted = { usdRate: 4000, ...persisted }
        }
        return persisted
      },
    }
  )
)
