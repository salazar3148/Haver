import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  AppState,
  Transaction,
  Debt,
  Habit,
  Goal,
  Task,
  FocusSession,
  Lapse,
  Supply,
  CalendarEvent,
  Campaign,
  Resource,
  Quote,
} from './types'
import { uid } from '../utils/format'
import { todayISO, startOfWeek, addDays } from '../utils/date'
import { newlyUnlocked, XP } from './gamification'
import { MAIN } from './habits'

interface Store extends AppState {
  // finanzas
  addTransaction: (t: Omit<Transaction, 'id' | 'createdAt'>) => void
  removeTransaction: (id: string) => void
  // deudas
  addDebt: (d: Omit<Debt, 'id' | 'createdAt' | 'paid'>) => void
  payDebt: (id: string, amount: number) => void
  removeDebt: (id: string) => void
  // presupuestos
  setBudget: (category: string, limit: number) => void
  removeBudget: (id: string) => void
  // habitos
  addHabit: (h: Omit<Habit, 'id' | 'createdAt' | 'log'>) => void
  toggleHabit: (id: string, date: string) => void
  toggleHabitSub: (id: string, date: string, subId: string) => void
  removeHabit: (id: string) => void
  toggleFrozenDay: (date: string) => void
  freezeRange: (start: string, end: string, freeze: boolean) => void
  // metas
  addGoal: (g: Omit<Goal, 'id' | 'createdAt' | 'current' | 'completions' | 'completedAt'>) => void
  updateGoalProgress: (id: string, amount: number) => void
  toggleGoalPeriod: (id: string) => void
  removeGoal: (id: string) => void
  // tareas
  addTask: (t: Omit<Task, 'id' | 'createdAt' | 'done'>) => void
  toggleTask: (id: string) => void
  setFrog: (id: string) => void
  removeTask: (id: string) => void
  // enfoque
  addFocusSession: (f: Omit<FocusSession, 'id' | 'createdAt'>) => void
  // plan diario
  setIntention: (date: string, text: string) => void
  togglePlanHabit: (date: string, habitId: string) => void
  togglePlanGoal: (date: string, goalId: string) => void
  setFocusTarget: (date: string, n: number) => void
  completeShutdown: (date: string) => void
  // consumibles (cosas por acabarse)
  addSupply: (s: Omit<Supply, 'id' | 'createdAt' | 'lastBought'> & { lastBought?: string }) => void
  restockSupply: (id: string) => void
  removeSupply: (id: string) => void
  // lista de compras
  addShoppingItem: (name: string) => void
  toggleShoppingItem: (id: string) => void
  removeShoppingItem: (id: string) => void
  clearBoughtShopping: () => void
  // tropiezos / fallas
  addLapse: (l: Omit<Lapse, 'id' | 'createdAt'>) => void
  removeLapse: (id: string) => void
  // calendario
  addEvent: (e: Omit<CalendarEvent, 'id' | 'createdAt' | 'done'>) => void
  toggleEvent: (id: string) => void
  removeEvent: (id: string) => void
  addCampaign: (c: Omit<Campaign, 'id' | 'createdAt'>) => void
  removeCampaign: (id: string) => void
  // recursos (páginas web que aportan valor)
  addResource: (r: Omit<Resource, 'id' | 'createdAt'>) => void
  removeResource: (id: string) => void
  // citas célebres
  addQuote: (q: Omit<Quote, 'id' | 'createdAt' | 'favorite'>) => void
  toggleQuoteFavorite: (id: string) => void
  removeQuote: (id: string) => void
  // sistema
  importState: (data: Partial<AppState>) => void
  resetAll: () => void
  _award: (xp: number) => void
  // Marca el uso de una función que no vive en AppState (tema, sync, respaldo...)
  // para que un logro pueda comprobarla. Ver gamification.ts / CONTEXT.md.
  markFeatureUsed: (feature: string) => void
}

const initial: AppState = {
  transactions: [],
  debts: [],
  budgets: [],
  habits: [],
  goals: [],
  tasks: [],
  focus: [],
  lapses: [],
  plans: {},
  supplies: [],
  shopping: [],
  events: [],
  campaigns: [],
  frozenDays: [],
  resources: [],
  quotes: [],
  game: { xp: 0, achievements: [], lastActiveDate: todayISO(), usedFeatures: [] },
}

const blankPlan = (date: string): import('./types').DayPlan => ({
  date,
  intention: '',
  habitIds: [],
  goalIds: [],
  focusTarget: 0,
  shutdown: false,
  createdAt: Date.now(),
})

export const useStore = create<Store>()(
  persist(
    (set, get) => {
      // Recalcula logros tras cualquier cambio (se guardan, ya no dan XP).
      const checkAchievements = () => {
        const s = get()
        const fresh = newlyUnlocked(s)
        if (fresh.length) {
          set((st) => ({
            game: {
              ...st.game,
              achievements: [...st.game.achievements, ...fresh],
            },
          }))
        }
      }

      const award = (xp: number) =>
        set((st) => ({ game: { ...st.game, xp: st.game.xp + xp } }))

      return {
        ...initial,
        _award: award,

        markFeatureUsed: (feature) => {
          if (get().game.usedFeatures.includes(feature)) return
          set((st) => ({
            game: { ...st.game, usedFeatures: [...st.game.usedFeatures, feature] },
          }))
          checkAchievements()
        },

        addTransaction: (t) => {
          set((st) => ({
            transactions: [
              { ...t, id: uid(), createdAt: Date.now() },
              ...st.transactions,
            ],
          }))
          award(XP.txLog)
          checkAchievements()
        },
        removeTransaction: (id) =>
          set((st) => ({
            transactions: st.transactions.filter((t) => t.id !== id),
          })),

        addDebt: (d) => {
          set((st) => ({
            debts: [
              { ...d, paid: 0, id: uid(), createdAt: Date.now() },
              ...st.debts,
            ],
          }))
          checkAchievements()
        },
        payDebt: (id, amount) => {
          set((st) => ({
            debts: st.debts.map((d) =>
              d.id === id
                ? { ...d, paid: Math.min(d.total, d.paid + amount) }
                : d
            ),
          }))
          award(XP.debtPay)
          checkAchievements()
        },
        removeDebt: (id) =>
          set((st) => ({ debts: st.debts.filter((d) => d.id !== id) })),

        setBudget: (category, limit) =>
          set((st) => {
            const existing = st.budgets.find((b) => b.category === category)
            if (existing) {
              return {
                budgets: st.budgets.map((b) =>
                  b.category === category ? { ...b, limit } : b
                ),
              }
            }
            return {
              budgets: [
                { id: uid(), category, limit, createdAt: Date.now() },
                ...st.budgets,
              ],
            }
          }),
        removeBudget: (id) =>
          set((st) => ({ budgets: st.budgets.filter((b) => b.id !== id) })),

        addHabit: (h) => {
          set((st) => ({
            habits: [
              { ...h, log: {}, id: uid(), createdAt: Date.now() },
              ...st.habits,
            ],
          }))
          checkAchievements()
        },
        toggleHabit: (id, date) => {
          const habit = get().habits.find((h) => h.id === id)
          if (!habit) return
          const subIds = habit.subs?.length ? habit.subs.map((s) => s.id) : [MAIN]
          const full = (habit.log[date]?.length ?? 0) >= subIds.length
          set((st) => ({
            habits: st.habits.map((h) =>
              h.id === id ? { ...h, log: { ...h.log, [date]: full ? [] : subIds } } : h
            ),
          }))
          award(full ? -XP.habitDone : XP.habitDone)
          checkAchievements()
        },
        toggleHabitSub: (id, date, subId) => {
          const habit = get().habits.find((h) => h.id === id)
          if (!habit) return
          const cur = habit.log[date] ?? []
          const has = cur.includes(subId)
          const next = has ? cur.filter((s) => s !== subId) : [...cur, subId]
          set((st) => ({
            habits: st.habits.map((h) =>
              h.id === id ? { ...h, log: { ...h.log, [date]: next } } : h
            ),
          }))
          const per = Math.max(3, Math.round(XP.habitDone / Math.max(1, habit.subs.length)))
          award(has ? -per : per)
          checkAchievements()
        },
        removeHabit: (id) =>
          set((st) => ({ habits: st.habits.filter((h) => h.id !== id) })),
        toggleFrozenDay: (date) => {
          set((st) => ({
            frozenDays: st.frozenDays.includes(date)
              ? st.frozenDays.filter((d) => d !== date)
              : [...st.frozenDays, date],
          }))
          checkAchievements()
        },
        freezeRange: (start, end, freeze) => {
          set((st) => {
            const set = new Set(st.frozenDays)
            let cur = start <= end ? start : end
            const last = start <= end ? end : start
            let guard = 0
            while (cur <= last && guard++ < 1000) {
              if (freeze) set.add(cur)
              else set.delete(cur)
              cur = addDays(cur, 1)
            }
            return { frozenDays: [...set] }
          })
          checkAchievements()
        },

        addGoal: (g) => {
          set((st) => ({
            goals: [
              { ...g, current: 0, completions: [], id: uid(), createdAt: Date.now() },
              ...st.goals,
            ],
          }))
          checkAchievements()
        },
        updateGoalProgress: (id, amount) => {
          const goal = get().goals.find((g) => g.id === id)
          const wasComplete = goal ? goal.current >= goal.target : false
          set((st) => ({
            goals: st.goals.map((g) => {
              if (g.id !== id) return g
              const current = Math.max(0, g.current + amount)
              const justDone = current >= g.target && g.current < g.target
              return {
                ...g,
                current,
                completedAt: justDone ? Date.now() : g.completedAt,
              }
            }),
          }))
          award(XP.goalProgress)
          const goalAfter = get().goals.find((g) => g.id === id)
          if (goalAfter && goalAfter.current >= goalAfter.target && !wasComplete)
            award(XP.goalComplete)
          checkAchievements()
        },
        toggleGoalPeriod: (id) => {
          const goal = get().goals.find((g) => g.id === id)
          if (!goal) return
          const key =
            goal.cadence === 'semanal' ? startOfWeek(todayISO()) : todayISO()
          const had = (goal.completions ?? []).includes(key)
          set((st) => ({
            goals: st.goals.map((g) =>
              g.id === id
                ? {
                    ...g,
                    completions: had
                      ? (g.completions ?? []).filter((k) => k !== key)
                      : [...(g.completions ?? []), key],
                  }
                : g
            ),
          }))
          award(had ? -XP.goalProgress : XP.goalProgress)
          checkAchievements()
        },
        removeGoal: (id) =>
          set((st) => ({ goals: st.goals.filter((g) => g.id !== id) })),

        addTask: (t) => {
          set((st) => ({
            tasks: [
              { ...t, done: false, id: uid(), createdAt: Date.now() },
              ...st.tasks,
            ],
          }))
          checkAchievements()
        },
        toggleTask: (id) => {
          const task = get().tasks.find((t) => t.id === id)
          const wasDone = task?.done
          set((st) => ({
            tasks: st.tasks.map((t) =>
              t.id === id
                ? { ...t, done: !t.done, completedAt: !t.done ? Date.now() : undefined }
                : t
            ),
          }))
          if (!wasDone) {
            award(task?.isFrog ? XP.frogDone : XP.taskDone)
          } else {
            award(-(task?.isFrog ? XP.frogDone : XP.taskDone))
          }
          checkAchievements()
        },
        setFrog: (id) =>
          set((st) => {
            const target = st.tasks.find((t) => t.id === id)
            const date = target?.date
            return {
              tasks: st.tasks.map((t) =>
                t.date === date
                  ? { ...t, isFrog: t.id === id ? !t.isFrog : false }
                  : t
              ),
            }
          }),
        removeTask: (id) =>
          set((st) => ({ tasks: st.tasks.filter((t) => t.id !== id) })),

        addFocusSession: (f) => {
          set((st) => ({
            focus: [{ ...f, id: uid(), createdAt: Date.now() }, ...st.focus],
          }))
          // XP completo si estuvo concentrado, la mitad si se distrajo (igual cuenta el esfuerzo)
          const base = Math.max(5, Math.round((f.minutes / 25) * XP.focusBlock))
          award(f.focused ? base : Math.round(base / 2))
          checkAchievements()
        },

        setIntention: (date, text) =>
          set((st) => ({
            plans: { ...st.plans, [date]: { ...(st.plans[date] ?? blankPlan(date)), intention: text } },
          })),
        togglePlanHabit: (date, habitId) =>
          set((st) => {
            const p = st.plans[date] ?? blankPlan(date)
            const has = p.habitIds.includes(habitId)
            return {
              plans: {
                ...st.plans,
                [date]: {
                  ...p,
                  habitIds: has ? p.habitIds.filter((id) => id !== habitId) : [...p.habitIds, habitId],
                },
              },
            }
          }),
        togglePlanGoal: (date, goalId) =>
          set((st) => {
            const p = st.plans[date] ?? blankPlan(date)
            const has = p.goalIds.includes(goalId)
            return {
              plans: {
                ...st.plans,
                [date]: {
                  ...p,
                  goalIds: has ? p.goalIds.filter((id) => id !== goalId) : [...p.goalIds, goalId],
                },
              },
            }
          }),
        setFocusTarget: (date, n) =>
          set((st) => ({
            plans: { ...st.plans, [date]: { ...(st.plans[date] ?? blankPlan(date)), focusTarget: Math.max(0, n) } },
          })),
        completeShutdown: (date) => {
          const p = get().plans[date]
          const already = p?.shutdown
          set((st) => ({
            plans: { ...st.plans, [date]: { ...(st.plans[date] ?? blankPlan(date)), shutdown: true } },
          }))
          if (!already) award(XP.planDay)
          checkAchievements()
        },

        addSupply: (s) => {
          set((st) => ({
            supplies: [
              { ...s, lastBought: s.lastBought ?? todayISO(), id: uid(), createdAt: Date.now() },
              ...st.supplies,
            ],
          }))
          checkAchievements()
        },
        restockSupply: (id) => {
          const sup = get().supplies.find((x) => x.id === id)
          set((st) => ({
            supplies: st.supplies.map((x) =>
              x.id === id ? { ...x, lastBought: todayISO() } : x
            ),
          }))
          if (!get().game.usedFeatures.includes('restock')) {
            set((st) => ({ game: { ...st.game, usedFeatures: [...st.game.usedFeatures, 'restock'] } }))
          }
          // Si tiene precio, registra el gasto automáticamente
          if (sup && sup.price > 0) {
            set((st) => ({
              transactions: [
                {
                  id: uid(),
                  type: 'gasto',
                  amount: sup.price,
                  category: 'Compras',
                  description: sup.name,
                  date: todayISO(),
                  createdAt: Date.now(),
                },
                ...st.transactions,
              ],
            }))
          }
          checkAchievements()
        },
        removeSupply: (id) =>
          set((st) => ({ supplies: st.supplies.filter((x) => x.id !== id) })),

        addShoppingItem: (name) => {
          set((st) => ({
            shopping: [
              { id: uid(), name: name.trim(), bought: false, createdAt: Date.now() },
              ...st.shopping,
            ],
          }))
          checkAchievements()
        },
        toggleShoppingItem: (id) =>
          set((st) => ({
            shopping: st.shopping.map((x) =>
              x.id === id ? { ...x, bought: !x.bought } : x
            ),
          })),
        removeShoppingItem: (id) =>
          set((st) => ({ shopping: st.shopping.filter((x) => x.id !== id) })),
        clearBoughtShopping: () =>
          set((st) => ({ shopping: st.shopping.filter((x) => !x.bought) })),

        addLapse: (l) => {
          set((st) => ({
            lapses: [{ ...l, id: uid(), createdAt: Date.now() }, ...st.lapses],
          }))
          checkAchievements()
        },
        removeLapse: (id) =>
          set((st) => ({ lapses: st.lapses.filter((l) => l.id !== id) })),

        addEvent: (e) => {
          set((st) => ({
            events: [{ ...e, done: false, id: uid(), createdAt: Date.now() }, ...st.events],
          }))
          checkAchievements()
        },
        toggleEvent: (id) =>
          set((st) => ({
            events: st.events.map((e) => (e.id === id ? { ...e, done: !e.done } : e)),
          })),
        removeEvent: (id) =>
          set((st) => ({ events: st.events.filter((e) => e.id !== id) })),
        addCampaign: (c) => {
          set((st) => ({
            campaigns: [{ ...c, id: uid(), createdAt: Date.now() }, ...st.campaigns],
          }))
          checkAchievements()
        },
        removeCampaign: (id) =>
          set((st) => ({ campaigns: st.campaigns.filter((c) => c.id !== id) })),

        addResource: (r) => {
          set((st) => ({
            resources: [{ ...r, id: uid(), createdAt: Date.now() }, ...st.resources],
          }))
          checkAchievements()
        },
        removeResource: (id) =>
          set((st) => ({ resources: st.resources.filter((r) => r.id !== id) })),

        addQuote: (q) => {
          set((st) => ({
            quotes: [{ ...q, favorite: false, id: uid(), createdAt: Date.now() }, ...st.quotes],
          }))
          checkAchievements()
        },
        toggleQuoteFavorite: (id) =>
          set((st) => ({
            quotes: st.quotes.map((q) => (q.id === id ? { ...q, favorite: !q.favorite } : q)),
          })),
        removeQuote: (id) =>
          set((st) => ({ quotes: st.quotes.filter((q) => q.id !== id) })),

        importState: (data) =>
          set(() => ({
            transactions: data.transactions ?? [],
            debts: data.debts ?? [],
            budgets: data.budgets ?? [],
            habits: data.habits ?? [],
            goals: data.goals ?? [],
            tasks: data.tasks ?? [],
            focus: data.focus ?? [],
            lapses: data.lapses ?? [],
            plans: data.plans ?? {},
            supplies: data.supplies ?? [],
            shopping: data.shopping ?? [],
            events: data.events ?? [],
            campaigns: data.campaigns ?? [],
            frozenDays: data.frozenDays ?? [],
            resources: data.resources ?? [],
            quotes: data.quotes ?? [],
            game: data.game
              ? { ...data.game, usedFeatures: data.game.usedFeatures ?? [] }
              : { xp: 0, achievements: [], lastActiveDate: todayISO(), usedFeatures: [] },
          })),

        resetAll: () => set({ ...initial }),
      }
    },
    {
      name: 'vida-quest-v1',
      version: 13,
      migrate: (persisted: any, version: number) => {
        if (!persisted) return persisted
        const s = persisted
        if (version < 2) {
          s.tasks = s.tasks ?? []
          s.focus = (s.focus ?? []).map((f: any) => ({ focused: true, ...f }))
          s.lapses = s.lapses ?? []
          s.goals = (s.goals ?? []).map((g: any) => ({
            cadence: 'unica',
            startDate: g.startDate ?? todayISO(),
            completions: [],
            deadline: g.deadline ?? todayISO(),
            ...g,
          }))
        }
        if (version < 3) {
          s.budgets = s.budgets ?? []
        }
        if (version < 4) {
          s.plans = s.plans ?? {}
        }
        if (version < 5) {
          s.supplies = s.supplies ?? []
          s.goals = (s.goals ?? []).map((g: any) => ({ money: false, ...g }))
        }
        if (version < 6) {
          s.habits = (s.habits ?? []).map((h: any) => ({ timeOfDay: '', ...h }))
        }
        if (version < 7) {
          s.shopping = s.shopping ?? []
          s.habits = (s.habits ?? []).map((h: any) => {
            const log: Record<string, string[]> = h.log ?? {}
            if (!h.log && Array.isArray(h.completed)) {
              h.completed.forEach((d: string) => {
                log[d] = ['main']
              })
            }
            return { ...h, subs: h.subs ?? [], log }
          })
        }
        if (version < 8) {
          s.events = s.events ?? []
          s.campaigns = s.campaigns ?? []
        }
        if (version < 9) {
          s.campaigns = (s.campaigns ?? []).map((c: any) => ({
            habitIds: c.habitIds ?? [],
            goalIds: c.goalIds ?? [],
            ...c,
          }))
        }
        if (version < 10) {
          s.frozenDays = s.frozenDays ?? []
          s.habits = (s.habits ?? []).map((h: any) => ({ days: h.days ?? [], ...h }))
        }
        if (version < 11) {
          s.game = { usedFeatures: [], ...(s.game ?? {}) }
        }
        if (version < 12) {
          s.resources = s.resources ?? []
        }
        if (version < 13) {
          s.quotes = s.quotes ?? []
        }
        return s
      },
    }
  )
)
