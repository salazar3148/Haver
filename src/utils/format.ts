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

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

export const clamp = (n: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, n))
