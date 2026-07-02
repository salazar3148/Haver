import type { Habit } from './types'
import { fromISO } from '../utils/date'

export const MAIN = 'main' // sub-id implícito para hábitos sin sub-hábitos

export const subCount = (h: Habit) => Math.max(1, h.subs?.length ?? 0)

export const dayDone = (h: Habit, date: string) => h.log?.[date]?.length ?? 0

export const dayFraction = (h: Habit, date: string) =>
  Math.min(1, dayDone(h, date) / subCount(h))

export const isDayFull = (h: Habit, date: string) =>
  dayDone(h, date) >= subCount(h)

export const isSubDone = (h: Habit, date: string, subId: string) =>
  h.log?.[date]?.includes(subId) ?? false

// Índice de día de semana con lunes = 0 ... domingo = 6
export const weekdayIndex = (iso: string) => (fromISO(iso).getDay() + 6) % 7

// ¿El hábito aplica ese día? (según los días elegidos; vacío = todos)
export const habitAppliesOn = (h: Habit, iso: string) =>
  !h.days || h.days.length === 0 || h.days.includes(weekdayIndex(iso))
