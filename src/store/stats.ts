import type { AppState } from './types'
import type { Campaign, Habit } from './types'
import { todayISO, startOfWeek, fromISO, toISO } from '../utils/date'
import { dayFraction, isDayFull, habitAppliesOn } from './habits'

const isoFromTs = (ts: number) => new Date(ts).toISOString().slice(0, 10)

// Cumplimiento de un día concreto (hábitos + metas diarias/semanales activas)
export interface DayCompliance {
  habitsDone: number
  habitsTotal: number
  goalsDone: number
  goalsTotal: number
  pct: number
  has: boolean // hubo algo medible ese día
}

export function dayCompliance(s: AppState, date: string): DayCompliance {
  const frozen = s.frozenDays?.includes(date)
  if (frozen) {
    return { habitsDone: 0, habitsTotal: 0, goalsDone: 0, goalsTotal: 0, pct: 0, has: false }
  }
  let hDone = 0
  let hTotal = 0
  s.habits.forEach((h) => {
    if (isoFromTs(h.createdAt) <= date && habitAppliesOn(h, date)) {
      hTotal++
      hDone += dayFraction(h, date)
    }
  })
  let gDone = 0
  let gTotal = 0
  s.goals.forEach((g) => {
    if (g.cadence === 'diaria' && g.startDate <= date) {
      gTotal++
      if ((g.completions ?? []).includes(date)) gDone++
    } else if (g.cadence === 'semanal' && startOfWeek(g.startDate) <= startOfWeek(date)) {
      gTotal++
      if ((g.completions ?? []).includes(startOfWeek(date))) gDone++
    }
  })
  const done = hDone + gDone
  const total = hTotal + gTotal
  return {
    habitsDone: Math.round(hDone),
    habitsTotal: hTotal,
    goalsDone: gDone,
    goalsTotal: gTotal,
    pct: total ? Math.round((done / total) * 100) : 0,
    has: total > 0,
  }
}

// ===== Progreso de un objetivo/campaña con hábitos y metas enlazados =====

export interface CampaignSeries {
  series: { label: string; pct: number; date: string }[]
  overall: number // % promedio de los días transcurridos
  daysElapsed: number
  totalDays: number
  bestPct: number
}

export function campaignSeries(s: AppState, c: Campaign): CampaignSeries {
  const today = todayISO()
  const habits = (c.habitIds?.length ? s.habits.filter((h) => c.habitIds.includes(h.id)) : s.habits)
  const goals = c.goalIds?.length
    ? s.goals.filter((g) => c.goalIds.includes(g.id))
    : s.goals.filter((g) => g.cadence !== 'unica')

  const start = c.startDate
  const last = c.endDate < today ? c.endDate : today
  const totalDays =
    Math.round((fromISO(c.endDate).getTime() - fromISO(start).getTime()) / 86400000) + 1

  const series: { label: string; pct: number; date: string }[] = []
  let sumPct = 0
  let count = 0
  const cursor = fromISO(start)
  while (toISO(cursor) <= last) {
    const d = toISO(cursor)
    if (s.frozenDays?.includes(d)) {
      cursor.setDate(cursor.getDate() + 1)
      continue
    }
    let done = 0
    let total = 0
    habits.forEach((h) => {
      if (!habitAppliesOn(h, d)) return
      total++
      done += dayFraction(h, d)
    })
    goals.forEach((g) => {
      if (g.cadence === 'diaria') {
        total++
        if ((g.completions ?? []).includes(d)) done++
      } else if (g.cadence === 'semanal') {
        total++
        if ((g.completions ?? []).includes(startOfWeek(d))) done++
      } else {
        total++
        if (g.target > 0 && g.current >= g.target) done++
      }
    })
    const pct = total ? Math.round((done / total) * 100) : 0
    series.push({ label: String(cursor.getDate()), pct, date: d })
    sumPct += pct
    count++
    cursor.setDate(cursor.getDate() + 1)
  }

  return {
    series,
    overall: count ? Math.round(sumPct / count) : 0,
    daysElapsed: count,
    totalDays,
    bestPct: series.reduce((a, x) => Math.max(a, x.pct), 0),
  }
}

export interface CatScore {
  key: string
  emoji: string
  done: number
  total: number
}

export interface Score {
  cats: CatScore[]
  done: number
  total: number
  realizacion: number // % completado
  fallas: number // % no cumplido
  lapses: number // tropiezos registrados en el periodo
}

/**
 * Calcula el marcador de un periodo (mes o año): cuánto cumpliste vs cuánto
 * dejaste pendiente, a partir de hábitos, tareas, metas recurrentes y enfoque.
 */
export function computeScore(s: AppState, periodDaysRaw: string[]): Score {
  const today = todayISO()
  const days = periodDaysRaw.filter((d) => d <= today)
  const daySet = new Set(days)

  // Hábitos: suma de cumplimiento (fracción por sub-hábitos) / días disponibles
  let hDone = 0
  let hTotal = 0
  const frozenSet = new Set(s.frozenDays ?? [])
  s.habits.forEach((h) => {
    const created = isoFromTs(h.createdAt)
    days.forEach((d) => {
      if (d >= created && habitAppliesOn(h, d) && !frozenSet.has(d)) {
        hTotal++
        hDone += dayFraction(h, d)
      }
    })
  })
  hDone = Math.round(hDone)

  // Tareas del periodo: completadas / total
  const ptasks = s.tasks.filter((t) => daySet.has(t.date))
  const tTotal = ptasks.length
  const tDone = ptasks.filter((t) => t.done).length

  // Metas recurrentes: periodos cumplidos / esperados dentro del rango
  let gDone = 0
  let gTotal = 0
  s.goals.forEach((g) => {
    if (g.cadence === 'diaria') {
      days.forEach((d) => {
        if (d >= g.startDate) {
          gTotal++
          if ((g.completions ?? []).includes(d)) gDone++
        }
      })
    } else if (g.cadence === 'semanal') {
      const weeks = new Set<string>()
      days.forEach((d) => {
        const w = startOfWeek(d)
        if (w >= startOfWeek(g.startDate)) weeks.add(w)
      })
      weeks.forEach((w) => {
        gTotal++
        if ((g.completions ?? []).includes(w)) gDone++
      })
    }
  })

  // Enfoque: sesiones concentradas / total (calidad)
  const pf = s.focus.filter((f) => daySet.has(f.date))
  const fTotal = pf.length
  const fDone = pf.filter((f) => f.focused).length

  const lapses = s.lapses.filter((l) => daySet.has(l.date)).length

  const cats: CatScore[] = [
    { key: 'Hábitos', emoji: '🔁', done: hDone, total: hTotal },
    { key: 'Tareas', emoji: '✅', done: tDone, total: tTotal },
    { key: 'Metas', emoji: '🎯', done: gDone, total: gTotal },
    { key: 'Enfoque', emoji: '🎧', done: fDone, total: fTotal },
  ]
  const done = cats.reduce((a, c) => a + c.done, 0)
  const total = cats.reduce((a, c) => a + c.total, 0)
  const realizacion = total ? Math.round((done / total) * 100) : 0
  return { cats, done, total, realizacion, fallas: total ? 100 - realizacion : 0, lapses }
}

// ===== Estadísticas por hábito =====
export interface HabitStat {
  total: number // días aplicables (sin congelados)
  completed: number // días cumplidos al 100%
  partial: number // días con cumplimiento parcial
  notCompleted: number // días aplicables no cumplidos
  frozen: number // días congelados que aplicaban
  pct: number // % de cumplimiento (con fracciones)
  streak: number // racha actual de días completos
}

export function habitStats(s: AppState, h: Habit): HabitStat {
  const today = todayISO()
  const created = isoFromTs(h.createdAt)
  const frozenSet = new Set(s.frozenDays ?? [])
  let total = 0
  let completed = 0
  let partial = 0
  let doneSum = 0
  let frozen = 0
  const cur = fromISO(created)
  while (toISO(cur) <= today) {
    const d = toISO(cur)
    if (habitAppliesOn(h, d)) {
      if (frozenSet.has(d)) frozen++
      else {
        total++
        const f = dayFraction(h, d)
        doneSum += f
        if (f >= 1) completed++
        else if (f > 0) partial++
      }
    }
    cur.setDate(cur.getDate() + 1)
  }
  // Racha actual de días completos (saltando congelados y días no aplicables)
  let streak = 0
  const c2 = fromISO(today)
  while (toISO(c2) >= created) {
    const d = toISO(c2)
    if (habitAppliesOn(h, d) && !frozenSet.has(d)) {
      if (isDayFull(h, d)) streak++
      else if (d !== today) break
    }
    c2.setDate(c2.getDate() - 1)
  }
  return {
    total,
    completed,
    partial,
    notCompleted: total - completed,
    frozen,
    pct: total ? Math.round((doneSum / total) * 100) : 0,
    streak,
  }
}

// ===== Puntualidad de metas (única) completadas =====
export interface Punctuality {
  antes: number
  enTiempo: number
  despues: number
  total: number
}

export function goalPunctuality(s: AppState): Punctuality {
  let antes = 0
  let enTiempo = 0
  let despues = 0
  s.goals.forEach((g) => {
    if (g.cadence !== 'unica' || g.target <= 0 || g.current < g.target || !g.completedAt) return
    const done = isoFromTs(g.completedAt)
    if (done < g.deadline) antes++
    else if (done === g.deadline) enTiempo++
    else despues++
  })
  return { antes, enTiempo, despues, total: antes + enTiempo + despues }
}
