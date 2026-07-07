import { useCallback, useRef } from 'react'
import { Excalidraw } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import { useStore } from '../store/useStore'
import { useUi } from '../store/useUi'

// Lienzo del Tablero basado en Excalidraw. Se carga de forma perezosa (lazy)
// desde Tablero.tsx para no inflar el bundle inicial.
export default function BoardCanvas() {
  // La escena inicial se lee una sola vez al montar (Excalidraw es no-controlado
  // tras el montaje: initialData solo se usa una vez).
  const initial = useRef(useStore.getState().boardScene)
  const setBoardScene = useStore((s) => s.setBoardScene)
  const boardTheme = useUi((s) => s.boardTheme)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // onChange se dispara muchísimo (al dibujar). Guardamos con debounce.
  const onChange = useCallback(
    (elements: readonly any[], _appState: any, files: any) => {
      clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        setBoardScene(elements as any[], (files ?? {}) as Record<string, any>)
      }, 700)
    },
    [setBoardScene]
  )

  return (
    <Excalidraw
      initialData={{
        elements: initial.current.elements ?? [],
        files: initial.current.files ?? {},
        scrollToContent: true,
        appState: { viewModeEnabled: false },
      }}
      onChange={onChange}
      theme={boardTheme === 'dark' ? 'dark' : 'light'}
      langCode="es-ES"
    />
  )
}
