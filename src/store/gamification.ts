import type { AppState } from './types'
import { todayISO, toISO } from '../utils/date'

// ===== Niveles =====
// XP necesaria acumulada para alcanzar el nivel n sigue una curva creciente.
export const xpForLevel = (level: number) =>
  Math.round(100 * Math.pow(level, 1.5))

export interface LevelInfo {
  level: number
  current: number // xp dentro del nivel actual
  needed: number // xp total para subir de nivel
  progress: number // 0..100
  totalXp: number
}

export const getLevelInfo = (xp: number): LevelInfo => {
  let level = 1
  let acc = 0
  while (xp >= acc + xpForLevel(level)) {
    acc += xpForLevel(level)
    level++
  }
  const needed = xpForLevel(level)
  const current = xp - acc
  return {
    level,
    current,
    needed,
    progress: Math.round((current / needed) * 100),
    totalXp: xp,
  }
}

export const rankName = (level: number) => {
  if (level >= 40) return 'Leyenda'
  if (level >= 30) return 'Maestro'
  if (level >= 20) return 'Veterano'
  if (level >= 12) return 'Experto'
  if (level >= 7) return 'Aventurero'
  if (level >= 3) return 'Aprendiz'
  return 'Novato'
}

// ===== Rachas =====
/** Calcula la racha actual (días consecutivos con al menos un hábito completado). */
export const computeStreak = (habits: AppState['habits']): number => {
  const done = new Set<string>()
  habits.forEach((h) =>
    Object.keys(h.log ?? {}).forEach((d) => {
      if ((h.log[d]?.length ?? 0) > 0) done.add(d)
    })
  )
  if (done.size === 0) return 0
  let streak = 0
  const cursor = new Date()
  // Si hoy no hay nada, la racha puede seguir viva si ayer sí; empezamos desde hoy.
  for (;;) {
    const iso = toISO(cursor)
    if (done.has(iso)) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    } else if (streak === 0 && iso === todayISO()) {
      // hoy aún sin completar: no rompe la racha, miramos ayer
      cursor.setDate(cursor.getDate() - 1)
    } else {
      break
    }
  }
  return streak
}

// ===== Logros =====
export interface Achievement {
  id: string
  name: string
  desc: string
  icon: string
  check: (s: AppState) => boolean
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-habit',
    name: 'Primer paso',
    desc: 'Crea tu primer hábito',
    icon: '🌱',
    check: (s) => s.habits.length >= 1,
  },
  {
    id: 'habit-collector',
    name: 'Coleccionista',
    desc: 'Ten 5 hábitos activos',
    icon: '🗂️',
    check: (s) => s.habits.length >= 5,
  },
  {
    id: 'streak-3',
    name: 'En marcha',
    desc: 'Racha de 3 días',
    icon: '🔥',
    check: (s) => computeStreak(s.habits) >= 3,
  },
  {
    id: 'streak-7',
    name: 'Semana imparable',
    desc: 'Racha de 7 días',
    icon: '⚡',
    check: (s) => computeStreak(s.habits) >= 7,
  },
  {
    id: 'streak-30',
    name: 'Hierro forjado',
    desc: 'Racha de 30 días',
    icon: '💎',
    check: (s) => computeStreak(s.habits) >= 30,
  },
  {
    id: 'first-income',
    name: 'Primer ingreso',
    desc: 'Registra un ingreso',
    icon: '💰',
    check: (s) => s.transactions.some((t) => t.type === 'ingreso'),
  },
  {
    id: 'saver',
    name: 'Ahorrador',
    desc: 'Balance positivo de $1.000.000',
    icon: '🏦',
    check: (s) => {
      const bal = s.transactions.reduce(
        (a, t) => a + (t.type === 'ingreso' ? t.amount : -t.amount),
        0
      )
      return bal >= 1000000
    },
  },
  {
    id: 'debt-free',
    name: 'Libre de deudas',
    desc: 'Liquida una deuda por completo',
    icon: '🕊️',
    check: (s) => s.debts.some((d) => d.paid >= d.total && d.total > 0),
  },
  {
    id: 'goal-getter',
    name: 'Cumplidor',
    desc: 'Completa una meta',
    icon: '🎯',
    check: (s) => s.goals.some((g) => g.current >= g.target),
  },
  {
    id: 'scholar',
    name: 'Estudioso',
    desc: 'Completa una meta de estudio',
    icon: '📚',
    check: (s) =>
      s.goals.some((g) => g.type === 'estudio' && g.current >= g.target),
  },
  {
    id: 'level-10',
    name: 'Doble dígito',
    desc: 'Alcanza el nivel 10',
    icon: '👑',
    check: (s) => getLevelInfo(s.game.xp).level >= 10,
  },
  {
    id: 'first-focus',
    name: 'Modo concentración',
    desc: 'Completa tu primera sesión de enfoque',
    icon: '🎧',
    check: (s) => s.focus.length >= 1,
  },
  {
    id: 'deep-work',
    name: 'Trabajo profundo',
    desc: 'Acumula 120 min de enfoque en un día',
    icon: '🧘‍♂️',
    check: (s) => {
      const byDay = new Map<string, number>()
      s.focus.forEach((f) => byDay.set(f.date, (byDay.get(f.date) ?? 0) + f.minutes))
      return [...byDay.values()].some((m) => m >= 120)
    },
  },
  {
    id: 'focus-marathon',
    name: 'Maratón mental',
    desc: 'Acumula 1000 min de enfoque en total',
    icon: '🚀',
    check: (s) => s.focus.reduce((a, f) => a + f.minutes, 0) >= 1000,
  },
  {
    id: 'frog-eater',
    name: 'Cómete la rana',
    desc: 'Completa la tarea más importante del día',
    icon: '🐸',
    check: (s) => s.tasks.some((t) => t.isFrog && t.done),
  },
  {
    id: 'task-master',
    name: 'Productivo',
    desc: 'Completa 25 tareas',
    icon: '✅',
    check: (s) => s.tasks.filter((t) => t.done).length >= 25,
  },
  {
    id: 'intentional',
    name: 'Con intención',
    desc: 'Define el "cuándo y dónde" de un hábito',
    icon: '🧭',
    check: (s) => s.habits.some((h) => h.cue.trim().length > 0),
  },
  {
    id: 'self-aware',
    name: 'Autoconciencia',
    desc: 'Registra tu primer tropiezo para aprender de él',
    icon: '🔍',
    check: (s) => s.lapses.length >= 1,
  },
  {
    id: 'tree-builder',
    name: 'Divide y vencerás',
    desc: 'Crea una meta con al menos 2 sub-metas',
    icon: '🌳',
    check: (s) => {
      const counts = new Map<string, number>()
      s.goals.forEach((g) => {
        if (g.parentId) counts.set(g.parentId, (counts.get(g.parentId) ?? 0) + 1)
      })
      return [...counts.values()].some((n) => n >= 2)
    },
  },
  {
    id: 'budgeter',
    name: 'Con presupuesto',
    desc: 'Define tu primer presupuesto mensual',
    icon: '🧾',
    check: (s) => s.budgets.length >= 1,
  },
  {
    id: 'big-saver',
    name: 'Pagarte primero',
    desc: 'Logra una tasa de ahorro del 20% en un mes',
    icon: '🐖',
    check: (s) => {
      const m = new Map<string, { inc: number; exp: number }>()
      s.transactions.forEach((t) => {
        const k = t.date.slice(0, 7)
        const e = m.get(k) ?? { inc: 0, exp: 0 }
        if (t.type === 'ingreso') e.inc += t.amount
        else e.exp += t.amount
        m.set(k, e)
      })
      return [...m.values()].some((v) => v.inc > 0 && (v.inc - v.exp) / v.inc >= 0.2)
    },
  },
  {
    id: 'planner',
    name: 'Estratega',
    desc: 'Planea tu día definiendo una intención',
    icon: '🗒️',
    check: (s) => Object.values(s.plans ?? {}).some((p) => p.intention.trim().length > 0),
  },
  {
    id: 'shutdown',
    name: 'Cierre perfecto',
    desc: 'Completa el ritual de planear el día de mañana por la noche',
    icon: '🌙',
    check: (s) => Object.values(s.plans ?? {}).some((p) => p.shutdown),
  },
  {
    id: 'consistent-planner',
    name: 'Mente organizada',
    desc: 'Planea 7 días',
    icon: '🧠',
    check: (s) =>
      Object.values(s.plans ?? {}).filter((p) => p.shutdown || p.intention.trim()).length >= 7,
  },
  {
    id: 'previsor',
    name: 'Previsor',
    desc: 'Agrega algo a tu lista de cosas por acabarse',
    icon: '🧴',
    check: (s) => (s.supplies ?? []).length >= 1,
  },
  {
    id: 'shopping-goal',
    name: 'Meta financiera',
    desc: 'Completa una meta financiera',
    icon: '🛒',
    check: (s) => s.goals.some((g) => g.money && g.current >= g.target && g.target > 0),
  },

  // ── A partir de aquí: un logro por cada funcionalidad del calendario,
  // hábitos avanzados, tareas avanzadas, consumibles y preferencias/nube.
  // Regla del proyecto: toda función nueva DEBE tener su logro (ver CONTEXT.md).
  {
    id: 'debt-tracker',
    name: 'Bajo control',
    desc: 'Registra tu primera deuda para hacerle seguimiento',
    icon: '📋',
    check: (s) => s.debts.length >= 1,
  },
  {
    id: 'calendar-event',
    name: 'Agenda maestra',
    desc: 'Agrega tu primer evento al calendario',
    icon: '📅',
    check: (s) => s.events.length >= 1,
  },
  {
    id: 'campaign-starter',
    name: 'Trazador de objetivos',
    desc: 'Crea tu primer objetivo (reto de varios días) en el calendario',
    icon: '🚀',
    check: (s) => s.campaigns.length >= 1,
  },
  {
    id: 'frozen-first',
    name: 'Modo hielo',
    desc: 'Congela un día (viaje/ausencia) para que no penalice tus métricas',
    icon: '❄️',
    check: (s) => (s.frozenDays ?? []).length >= 1,
  },
  {
    id: 'shopping-list',
    name: 'Lista lista',
    desc: 'Agrega algo a tu lista de compras',
    icon: '🛍️',
    check: (s) => (s.shopping ?? []).length >= 1,
  },
  {
    id: 'restock-hero',
    name: 'Reabastecido',
    desc: 'Marca un consumible como recién comprado',
    icon: '🔁',
    check: (s) => (s.game.usedFeatures ?? []).includes('restock'),
  },
  {
    id: 'sub-habit-builder',
    name: 'Hábito compuesto',
    desc: 'Crea un hábito con 2 o más sub-hábitos (ej. mañana/tarde/noche)',
    icon: '🧩',
    check: (s) => s.habits.some((h) => (h.subs?.length ?? 0) >= 2),
  },
  {
    id: 'two-minute-rule',
    name: 'Menos de 2 minutos',
    desc: 'Completa una tarea marcada con la regla de los 2 minutos',
    icon: '⏱️',
    check: (s) => s.tasks.some((t) => t.quickWin && t.done),
  },
  {
    id: 'eisenhower-master',
    name: 'Maestro de Eisenhower',
    desc: 'Ten al menos una tarea en cada cuadrante de la matriz importante/urgente',
    icon: '🧮',
    check: (s) => {
      const quads = [
        [true, true],
        [true, false],
        [false, true],
        [false, false],
      ]
      return quads.every(([imp, urg]) =>
        s.tasks.some((t) => t.important === imp && t.urgent === urg)
      )
    },
  },
  {
    id: 'theme-explorer',
    name: 'Estilo propio',
    desc: 'Personaliza el tema o el color de acento de la app',
    icon: '🎨',
    check: (s) => (s.game.usedFeatures ?? []).includes('theme'),
  },
  {
    id: 'cloud-sync',
    name: 'En la nube',
    desc: 'Conecta tu cuenta y sincroniza tus datos entre dispositivos',
    icon: '☁️',
    check: (s) => (s.game.usedFeatures ?? []).includes('cloud-sync'),
  },
  {
    id: 'resource-curator',
    name: 'Curador de valor',
    desc: 'Guarda tu primera página web valiosa en Recursos',
    icon: '🔗',
    check: (s) => (s.resources ?? []).length >= 1,
  },
  {
    id: 'resource-library',
    name: 'Biblioteca personal',
    desc: 'Guarda 10 recursos web organizados por categoría',
    icon: '📚',
    check: (s) => (s.resources ?? []).length >= 10,
  },
  {
    id: 'quote-collector',
    name: 'Sabiduría guardada',
    desc: 'Guarda tu primera cita célebre para inspirarte',
    icon: '💬',
    check: (s) => (s.quotes ?? []).length >= 1,
  },
  {
    id: 'quote-shelf',
    name: 'Estante de inspiración',
    desc: 'Guarda 15 citas célebres',
    icon: '🏛️',
    check: (s) => (s.quotes ?? []).length >= 15,
  },
  {
    id: 'quote-favorite',
    name: 'Tu frase favorita',
    desc: 'Marca una cita como favorita',
    icon: '⭐',
    check: (s) => (s.quotes ?? []).some((q) => q.favorite),
  },

  // ── Tablero (corcho): notas, pendientes y polaroids fijados con chinchetas.
  {
    id: 'board-first',
    name: 'Primera chincheta',
    desc: 'Fija tu primera nota en el Tablero (tu corcho personal)',
    icon: '📌',
    check: (s) => (s.boardNotes ?? []).length >= 1,
  },
  {
    id: 'board-todo',
    name: 'Lista al muro',
    desc: 'Crea una nota de pendientes (checklist) en el Tablero',
    icon: '🧷',
    check: (s) => (s.boardNotes ?? []).some((n) => n.kind === 'todo'),
  },
  {
    id: 'board-todo-done',
    name: 'Tachado del muro',
    desc: 'Completa un pendiente de una nota del Tablero',
    icon: '✔️',
    check: (s) => (s.boardNotes ?? []).some((n) => n.items.some((it) => it.done)),
  },
  {
    id: 'board-photo',
    name: 'Recuerdo fijado',
    desc: 'Cuelga una nota tipo foto (polaroid) en el Tablero',
    icon: '📸',
    check: (s) => (s.boardNotes ?? []).some((n) => n.kind === 'photo'),
  },
  {
    id: 'board-full',
    name: 'Corcho vivo',
    desc: 'Ten 10 notas fijadas en el Tablero a la vez',
    icon: '🗂️',
    check: (s) => (s.boardNotes ?? []).length >= 10,
  },
]

/** Devuelve los ids de logros recién desbloqueados que no estaban antes. */
export const newlyUnlocked = (s: AppState): string[] =>
  ACHIEVEMENTS.filter(
    (a) => !s.game.achievements.includes(a.id) && a.check(s)
  ).map((a) => a.id)

// XP otorgada por cada acción
export const XP = {
  habitDone: 15,
  txLog: 5,
  debtPay: 10,
  goalProgress: 8,
  goalComplete: 100,
  achievement: 50,
  taskDone: 12,
  frogDone: 30,
  focusBlock: 20, // por bloque de 25 min
  planDay: 25, // completar el ritual de planear el día
}
