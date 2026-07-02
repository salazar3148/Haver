import type { LapseArea } from './types'

// Metadata de las áreas donde se puede registrar un tropiezo.
// Compartida por Enfoque, Calendario y Hábitos (antes vivía en la página Mejora).
export const LAPSE_AREAS: { value: LapseArea; label: string; emoji: string; color: string }[] = [
  { value: 'estudio', label: 'Estudio', emoji: '📚', color: '#fbbf24' },
  { value: 'enfoque', label: 'Enfoque', emoji: '🎧', color: '#8b5cf6' },
  { value: 'habito', label: 'Hábito', emoji: '🔁', color: '#22d3ee' },
  { value: 'alimentacion', label: 'Alimentación', emoji: '🍔', color: '#fb7185' },
  { value: 'sueno', label: 'Sueño', emoji: '😴', color: '#6366f1' },
  { value: 'finanzas', label: 'Finanzas', emoji: '💸', color: '#34d399' },
  { value: 'general', label: 'General', emoji: '⚠️', color: '#9a9ab4' },
]

export const lapseAreaMeta = (a: LapseArea) =>
  LAPSE_AREAS.find((x) => x.value === a) ?? LAPSE_AREAS[LAPSE_AREAS.length - 1]
