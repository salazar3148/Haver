import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { useUi } from '../store/useUi'
import { ACHIEVEMENTS, getLevelInfo } from '../store/gamification'
import { fireConfetti } from '../utils/fx'

interface ToastData {
  id: string
  emoji: string
  title: string
  sub: string
}

export function AchievementToast() {
  const achievements = useStore((s) => s.game.achievements)
  const xp = useStore((s) => s.game.xp)
  const effects = useUi((s) => s.effects)
  const prev = useRef<string[]>(achievements)
  const prevLevel = useRef<number>(getLevelInfo(xp).level)
  const [toasts, setToasts] = useState<ToastData[]>([])

  const push = (t: ToastData) => {
    setToasts((arr) => [...arr, t])
    setTimeout(() => setToasts((arr) => arr.filter((x) => x.id !== t.id)), 4600)
  }

  // Logros nuevos
  useEffect(() => {
    const added = achievements.filter((a) => !prev.current.includes(a))
    if (added.length) {
      if (effects) fireConfetti({ count: 130 })
      added.forEach((id) => {
        const a = ACHIEVEMENTS.find((x) => x.id === id)
        push({
          id: id + Date.now(),
          emoji: a?.icon ?? '🏆',
          title: '¡Logro desbloqueado!',
          sub: a?.name ?? id,
        })
      })
    }
    prev.current = achievements
  }, [achievements, effects])

  // Subida de nivel
  useEffect(() => {
    const lvl = getLevelInfo(xp).level
    if (lvl > prevLevel.current) {
      if (effects)
        fireConfetti({ count: 180, origin: { x: 0.5, y: 0.4 } })
      push({
        id: 'lvl' + Date.now(),
        emoji: '🆙',
        title: `¡Subiste a nivel ${lvl}!`,
        sub: 'Sigue así, vas imparable',
      })
    }
    prevLevel.current = lvl
  }, [xp, effects])

  if (!toasts.length) return null
  return (
    <div className="toast-wrap">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          <div className="toast-emoji">{t.emoji}</div>
          <div>
            <div className="toast-title">{t.title}</div>
            <div className="toast-sub">{t.sub}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
