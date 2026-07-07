// IMPORTANTE: nunca usar Date.toISOString() para obtener "la fecha de hoy":
// eso convierte a UTC y adelanta el día varias horas antes de medianoche en
// Colombia (UTC-5). Siempre se construye la fecha ISO con los componentes
// LOCALES del dispositivo (año/mes/día), que es lo que el usuario ve en su reloj.
export const toISO = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const todayISO = () => toISO(new Date())

export const fromISO = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const addDays = (s: string, days: number) => {
  const d = fromISO(s)
  d.setDate(d.getDate() + days)
  return toISO(d)
}

/** Devuelve un arreglo de N fechas ISO terminando hoy (incluido). */
export const lastNDays = (n: number): string[] => {
  const out: string[] = []
  const today = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    out.push(toISO(d))
  }
  return out
}

/** Etiqueta corta tipo "12 jun". */
export const shortLabel = (iso: string) => {
  const d = fromISO(iso)
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

export const weekdayShort = (iso: string) => {
  const d = fromISO(iso)
  return d.toLocaleDateString('es-MX', { weekday: 'short' })
}

/** Inicio de la semana (lunes) para una fecha ISO. */
export const startOfWeek = (iso: string) => {
  const d = fromISO(iso)
  const day = (d.getDay() + 6) % 7 // lunes = 0
  d.setDate(d.getDate() - day)
  return toISO(d)
}

/** Días de la semana actual, de lunes a domingo. */
export const currentWeek = (): string[] => {
  const start = startOfWeek(todayISO())
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

/** Días del mes actual (1..fin de mes) en ISO. */
export const currentMonth = (): string[] => {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const total = new Date(y, m + 1, 0).getDate()
  return Array.from({ length: total }, (_, i) => toISO(new Date(y, m, i + 1)))
}

/** Todos los días del año actual en ISO. */
export const currentYear = (): string[] => {
  const y = new Date().getFullYear()
  const out: string[] = []
  const d = new Date(y, 0, 1)
  while (d.getFullYear() === y) {
    out.push(toISO(d))
    d.setDate(d.getDate() + 1)
  }
  return out
}

/** Etiqueta de día en español: Lu, Ma, Mi, Ju, Vi, Sá, Do. */
export const dayLabelShort = (iso: string) => {
  const i = fromISO(iso).getDay()
  return ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'][i]
}

/** Número de día del mes. */
export const dayOfMonth = (iso: string) => fromISO(iso).getDate()

export const monthKey = (iso: string) => iso.slice(0, 7)

export const monthLabel = (key: string) => {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('es-MX', {
    month: 'short',
    year: '2-digit',
  })
}

export const monthLabelLong = (key: string) => {
  const [y, m] = key.split('-').map(Number)
  const s = new Date(y, m - 1, 1).toLocaleDateString('es-MX', {
    month: 'long',
    year: 'numeric',
  })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export const currentMonthKey = () => todayISO().slice(0, 7)

export const addMonthsKey = (key: string, delta: number) => {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Número de días del mes de una clave YYYY-MM. */
export const daysInMonthKey = (key: string) => {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

export const daysUntil = (iso: string) => {
  const ms = fromISO(iso).getTime() - fromISO(todayISO()).getTime()
  return Math.round(ms / 86400000)
}
