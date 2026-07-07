export const currency = (n: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)

export const currencyExact = (n: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)

// Quita el ".0" sobrante (102.0 -> 102, 102.5 -> 102.5)
const trim1 = (x: number) => {
  const s = x.toFixed(1)
  return s.endsWith('.0') ? s.slice(0, -2) : s
}

// Formato compacto en COP: >=100mil -> "$100k", "$102.5k"; >=1millón -> "$1.2M"
export const currencyShort = (n: number) => {
  const sign = n < 0 ? '-' : ''
  const a = Math.abs(n)
  if (a >= 1_000_000) return `${sign}$${trim1(a / 1_000_000)}M`
  if (a >= 100_000) return `${sign}$${trim1(a / 1_000)}k`
  return currency(n)
}

// ===== Multi-moneda (COP / USD) =====
import type { Currency } from '../store/types'

// Formatea un monto en dólares con 2 decimales: "US$12.50"
export const usd = (n: number) =>
  'US$' +
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)

// Formatea un monto en su moneda nativa (COP entero, USD con decimales).
export const money = (n: number, cur: Currency) => (cur === 'USD' ? usd(n) : currency(n))

// Versión compacta según la moneda.
export const moneyShort = (n: number, cur: Currency) => (cur === 'USD' ? usd(n) : currencyShort(n))

// Convierte cualquier monto a COP usando la tasa del día (COP por 1 USD).
export const toCOP = (n: number, cur: Currency, rate: number) => (cur === 'USD' ? n * rate : n)

// Texto de equivalencia en COP cuando el monto está en dólares (si no, vacío).
export const copHint = (n: number, cur: Currency, rate: number) =>
  cur === 'USD' ? `≈ ${currencyShort(n * rate)}` : ''

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

export const clamp = (n: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, n))
