import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UiState {
  themeId: string
  accent: string | null // acento personalizado (override del tema)
  effects: boolean // animaciones/efectos visuales
  focusMin: number // duración de enfoque preferida
  breakMin: number // duración de descanso preferida
  setTheme: (id: string) => void
  setAccent: (color: string | null) => void
  toggleEffects: () => void
  setFocusMin: (n: number) => void
  setBreakMin: (n: number) => void
}

export const useUi = create<UiState>()(
  persist(
    (set) => ({
      themeId: 'cueva',
      accent: null,
      effects: true,
      focusMin: 25,
      breakMin: 5,
      setTheme: (id) => set({ themeId: id }),
      setAccent: (color) => set({ accent: color }),
      toggleEffects: () => set((s) => ({ effects: !s.effects })),
      setFocusMin: (n) => set({ focusMin: n }),
      setBreakMin: (n) => set({ breakMin: n }),
    }),
    {
      name: 'vida-quest-ui',
      version: 1,
      migrate: (persisted: any, version: number) => {
        if (version < 1 && persisted) {
          return { ...persisted, themeId: 'cueva', accent: null }
        }
        return persisted
      },
    }
  )
)
