import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UiState {
  themeId: string
  accent: string | null // acento personalizado (override del tema)
  effects: boolean // animaciones/efectos visuales
  focusMin: number // duración de enfoque preferida
  breakMin: number // duración de descanso preferida
  boardTheme: 'light' | 'dark' // tema del Tablero: día (blanco) / noche (negro)
  setTheme: (id: string) => void
  setAccent: (color: string | null) => void
  toggleEffects: () => void
  setFocusMin: (n: number) => void
  setBreakMin: (n: number) => void
  setBoardTheme: (t: 'light' | 'dark') => void
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
      setTheme: (id) => set({ themeId: id }),
      setAccent: (color) => set({ accent: color }),
      toggleEffects: () => set((s) => ({ effects: !s.effects })),
      setFocusMin: (n) => set({ focusMin: n }),
      setBreakMin: (n) => set({ breakMin: n }),
      setBoardTheme: (t) => set({ boardTheme: t }),
    }),
    {
      name: 'vida-quest-ui',
      version: 2,
      migrate: (persisted: any, version: number) => {
        if (version < 1 && persisted) {
          persisted = { ...persisted, themeId: 'cueva', accent: null }
        }
        if (version < 2 && persisted) {
          persisted = { boardTheme: 'light', ...persisted }
        }
        return persisted
      },
    }
  )
)
