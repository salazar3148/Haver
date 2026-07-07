import { Suspense, lazy } from 'react'
import { Sun, Moon } from 'lucide-react'
import { useUi } from '../store/useUi'
import { XpWidget } from '../App'

// Excalidraw es pesado: se carga solo cuando entras al Tablero.
const BoardCanvas = lazy(() => import('../components/BoardCanvas'))

export function Tablero() {
  const boardTheme = useUi((s) => s.boardTheme)
  const setBoardTheme = useUi((s) => s.setBoardTheme)

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Tablero</div>
          <div className="page-sub">Tu lienzo infinito para dibujar, apuntar, hacer cuadros y guardar recuerdos</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            className="btn btn-sm"
            onClick={() => setBoardTheme(boardTheme === 'dark' ? 'light' : 'dark')}
            title="Cambiar el fondo del lienzo"
          >
            {boardTheme === 'dark' ? (
              <>
                <Sun size={14} /> Día
              </>
            ) : (
              <>
                <Moon size={14} /> Noche
              </>
            )}
          </button>
          <XpWidget />
        </div>
      </div>

      <div className="board-wrap">
        <Suspense fallback={<div className="board-loading">Cargando lienzo…</div>}>
          <BoardCanvas />
        </Suspense>
      </div>
    </>
  )
}
