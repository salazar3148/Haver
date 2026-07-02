import type { Goal, GoalCadence } from './types'
import { todayISO, startOfWeek, fromISO } from '../utils/date'

const DAY = 86400000

export const periodKey = (cadence: GoalCadence, iso = todayISO()) =>
  cadence === 'semanal' ? startOfWeek(iso) : iso

/** Cuántos periodos "deberían" haberse cumplido desde el inicio hasta hoy. */
export const expectedPeriods = (g: Goal): number => {
  const start = g.startDate || todayISO()
  if (g.cadence === 'diaria') {
    const days =
      Math.floor((fromISO(todayISO()).getTime() - fromISO(start).getTime()) / DAY) + 1
    return Math.max(1, days)
  }
  if (g.cadence === 'semanal') {
    const a = fromISO(startOfWeek(start)).getTime()
    const b = fromISO(startOfWeek(todayISO())).getTime()
    return Math.max(1, Math.round((b - a) / (DAY * 7)) + 1)
  }
  return 1
}

export const completedPeriods = (g: Goal) => g.completions?.length ?? 0

/** Periodos pendientes acumulados (lo que no cumpliste y se va sumando). */
export const pendingPeriods = (g: Goal): number => {
  if (g.cadence === 'unica') return 0
  return Math.max(0, expectedPeriods(g) - completedPeriods(g))
}

/** ¿Cumpliste el periodo actual (hoy / esta semana)? */
export const doneCurrentPeriod = (g: Goal): boolean =>
  (g.completions ?? []).includes(periodKey(g.cadence))

/** Tasa de cumplimiento histórica de una meta recurrente (0..1). */
export const completionRate = (g: Goal): number => {
  if (g.cadence === 'unica') return g.target > 0 ? Math.min(1, g.current / g.target) : 0
  const exp = expectedPeriods(g)
  return exp > 0 ? Math.min(1, completedPeriods(g) / exp) : 0
}

export const childrenOf = (goals: Goal[], id: string) =>
  goals.filter((g) => g.parentId === id)

export const rootGoals = (goals: Goal[]) =>
  goals.filter((g) => !g.parentId || !goals.some((x) => x.id === g.parentId))

/** Recoge todos los descendientes de una meta (para borrar en cascada). */
export const descendantIds = (goals: Goal[], id: string): string[] => {
  const kids = childrenOf(goals, id)
  return kids.flatMap((k) => [k.id, ...descendantIds(goals, k.id)])
}

/** ¿La meta está cumplida "ahora"? Considera el árbol. */
export const isGoalDone = (goals: Goal[], g: Goal): boolean => {
  const kids = childrenOf(goals, g.id)
  if (kids.length) return kids.every((k) => isGoalDone(goals, k))
  if (g.cadence === 'unica') return g.target > 0 ? g.current >= g.target : false
  return doneCurrentPeriod(g)
}

/** Progreso 0..100 de una meta, derivado de sus hijos si los tiene. */
export const goalProgress = (goals: Goal[], g: Goal): number => {
  const kids = childrenOf(goals, g.id)
  if (kids.length) {
    const done = kids.filter((k) => isGoalDone(goals, k)).length
    return Math.round((done / kids.length) * 100)
  }
  return Math.round(completionRate(g) * 100)
}