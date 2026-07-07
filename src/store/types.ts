// ===== Tipos de dominio =====

export type TxType = 'ingreso' | 'gasto'

// Moneda de un monto. Todo se puede registrar en COP o en dólares (USD).
// Internamente los cálculos se normalizan a COP usando la tasa del día (useUi.usdRate).
export type Currency = 'COP' | 'USD'

export interface Transaction {
  id: string
  type: TxType
  amount: number
  currency: Currency // COP o USD (permite decimales)
  category: string
  description: string
  date: string // ISO yyyy-mm-dd
  createdAt: number
}

export interface Debt {
  id: string
  name: string
  creditor: string
  total: number
  paid: number
  currency: Currency
  dueDate: string // ISO
  createdAt: number
}

// Presupuesto mensual por categoría de gasto
export interface Budget {
  id: string
  category: string
  limit: number // límite mensual
  currency: Currency
  createdAt: number
}

export type HabitFrequency = 'diario' | 'semanal'

export interface Habit {
  id: string
  name: string
  icon: string
  color: string
  frequency: HabitFrequency
  targetPerWeek: number // veces por semana objetivo (para semanal)
  days: number[] // días de la semana en que aplica (0=Lu..6=Do); vacío = todos
  subs: { id: string; name: string }[] // sub-hábitos (ej. mañana/tarde/noche)
  log: Record<string, string[]> // fecha ISO -> ids de sub-hábitos cumplidos
  cue: string // intención de implementación: "cuándo y dónde" (Gollwitzer)
  reward: string // recompensa inmediata para cerrar el bucle del hábito (Fogg)
  createdAt: number
}

// Artículo de la lista de compras pendientes
export interface ShoppingItem {
  id: string
  name: string
  bought: boolean
  createdAt: number
}

// Un registro de precio (histórico) de algo que compras recurrentemente.
export interface PricePoint {
  id: string
  price: number
  currency: Currency
  store: string // dónde lo viste/compraste (opcional)
  date: string // ISO
  createdAt: number
}

// Artículo cuyo precio sigues en el tiempo para comprar cuando esté barato.
export interface PriceItem {
  id: string
  name: string
  emoji: string
  unit: string // cantidad de referencia (ej. "1 kg", "500 ml") opcional
  history: PricePoint[]
  createdAt: number
}

// Nivel de deseo de un artículo de la wishlist
export type WishPriority = 'baja' | 'media' | 'alta'

// Artículo de la lista de deseos: algo que quiero comprar más adelante y
// quiero tener a la vista con su precio (para ir soñando/planeando).
export interface WishItem {
  id: string
  name: string
  emoji: string
  price: number
  currency: Currency
  note: string
  priority: WishPriority
  createdAt: number
}

export type GoalType = 'finanzas' | 'estudio' | 'personal'

// Cadencia de la meta: única (general/largo plazo), diaria o semanal (recurrentes)
export type GoalCadence = 'unica' | 'diaria' | 'semanal'

export interface Goal {
  id: string
  title: string
  type: GoalType
  cadence: GoalCadence
  parentId?: string // para el árbol de metas (meta padre)
  startDate: string // ISO, desde cuándo cuenta
  target: number
  current: number
  unit: string
  money: boolean // meta de ahorro/compra (se mide en dinero)
  currency: Currency // moneda de la meta financiera (COP/USD); irrelevante si money=false
  deadline: string // ISO (metas únicas)
  completions: string[] // periodos cumplidos (diaria: fecha ISO; semanal: lunes ISO)
  createdAt: number
  completedAt?: number
}

// Consumible que se va acabando (despensa / cosas por acabarse)
export interface Supply {
  id: string
  name: string
  emoji: string
  lastBought: string // ISO, última vez que lo compraste
  durationDays: number // cuánto te dura
  price: number // precio aprox (0 = sin registrar gasto)
  currency: Currency
  createdAt: number
}

// Página web que aporta valor (recurso guardado): título, URL y por qué sirve
export interface Resource {
  id: string
  title: string
  url: string
  description: string
  category: string // etiqueta libre (ej. "Productividad", "Finanzas", "Salud")
  createdAt: number
}

// Cita célebre guardada para inspirarse (autor opcional)
export interface Quote {
  id: string
  text: string
  author: string // opcional: puede quedar vacío si no se conoce el autor
  favorite: boolean
  createdAt: number
}

// ===== Tablero (corcho) =====
// Tipos de nota que se pueden fijar en el tablero.
// sticky/paper/todo/photo = tarjetas; frame = cuadro redimensionable;
// text = solo texto; sticker = emoji decorativo escalable.
export type NoteKind = 'sticky' | 'paper' | 'todo' | 'photo' | 'frame' | 'text' | 'sticker'

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}

// Una nota fijada en el tablero. Posición libre (x,y en px dentro del corcho),
// rotación ligera y orden de apilamiento (z) para simular papeles reales.
export interface BoardNote {
  id: string
  kind: NoteKind
  text: string // contenido (sticky/paper), pie de foto (photo) o título (todo)
  emoji: string // "foto" del polaroid o acento decorativo
  color: string // color del papel (hex)
  pin: string // color de la chincheta (hex)
  items: ChecklistItem[] // ítems (solo para kind 'todo')
  x: number
  y: number
  rot: number // rotación en grados
  z: number // orden de apilamiento
  w?: number // ancho (frame) o tamaño de fuente (sticker)
  h?: number // alto (frame)
  showLabel?: boolean // frame: mostrar el título (opcional). undefined = true
  title?: string // frame: título opcional (el cuerpo va en `text`)
  createdAt: number
}

// ===== Tablero (lienzo estilo Excalidraw) =====
// Escena del pizarrón: elementos y archivos (imágenes) que dibuja Excalidraw.
// Se guardan tal cual los entrega Excalidraw para poder restaurarlos.
export interface BoardScene {
  elements: any[]
  files: Record<string, any>
}

export interface GameState {
  xp: number
  achievements: string[] // ids de logros desbloqueados
  lastActiveDate: string
  // Marcas de uso para funciones que viven fuera de AppState (tema, sync,
  // respaldo, etc.) y que un logro necesita poder comprobar igual que
  // cualquier otro dato. Ver CONTEXT.md § "Regla de oro: toda funcionalidad
  // tiene un logro".
  usedFeatures: string[]
}

// ===== Calendario =====
export type EventType = 'reunion' | 'cita' | 'tarea' | 'evento'

export interface CalendarEvent {
  id: string
  title: string
  date: string // ISO
  time: string // 'HH:MM' o ''
  type: EventType
  note: string
  done: boolean
  createdAt: number
}

// Objetivo de varios días (campaña) que pinta un rango del calendario
export interface Campaign {
  id: string
  title: string
  emoji: string
  color: string
  startDate: string // ISO
  endDate: string // ISO
  habitIds: string[] // hábitos enlazados
  goalIds: string[] // metas enlazadas
  createdAt: number
}

// Tarea / to-do con priorización conductual
export interface Task {
  id: string
  title: string
  important: boolean // cuadrante Eisenhower
  urgent: boolean
  isFrog: boolean // "Cómete la rana": la tarea más importante del día
  quickWin: boolean // regla de los 2 minutos
  estimate: number // pomodoros estimados
  done: boolean
  date: string // día asignado (ISO)
  createdAt: number
  completedAt?: number
}

// Sesión de enfoque (Pomodoro / deep work)
export interface FocusSession {
  id: string
  minutes: number
  label: string
  taskId?: string
  focused: boolean // true = concentrado, false = me distraje
  distraction?: string // qué te distrajo
  date: string // ISO
  createdAt: number
}

// Áreas donde se puede registrar un tropiezo
export type LapseArea =
  | 'estudio'
  | 'enfoque'
  | 'habito'
  | 'finanzas'
  | 'alimentacion'
  | 'sueno'
  | 'general'

// Registro de una falla / momento en que hiciste algo contrario a tus metas
export interface Lapse {
  id: string
  area: LapseArea
  trigger: string // detonante (ej. redes sociales, cansancio)
  note: string
  date: string // ISO
  hour: number // 0-23, hora del día
  createdAt: number
}

// Plan de un día: conecta tareas, hábitos, sub-metas y enfoque
export interface DayPlan {
  date: string // ISO (clave)
  intention: string // la intención principal del día
  habitIds: string[] // hábitos comprometidos
  goalIds: string[] // sub-metas diarias a empujar
  focusTarget: number // bloques de enfoque planeados
  shutdown: boolean // ritual de cierre de la noche completado
  createdAt: number
}

export interface AppState {
  transactions: Transaction[]
  debts: Debt[]
  budgets: Budget[]
  habits: Habit[]
  goals: Goal[]
  tasks: Task[]
  focus: FocusSession[]
  lapses: Lapse[]
  plans: Record<string, DayPlan>
  supplies: Supply[]
  shopping: ShoppingItem[]
  wishlist: WishItem[] // lista de deseos (cosas por comprar más adelante, con precio)
  priceItems: PriceItem[] // seguimiento de precios de compras recurrentes
  boardScene: BoardScene // lienzo del Tablero (Excalidraw): elementos + imágenes
  events: CalendarEvent[]
  campaigns: Campaign[]
  frozenDays: string[] // días congelados (viaje/ausencia): no penalizan
  resources: Resource[] // páginas web que aportan valor (recursos guardados)
  quotes: Quote[] // citas célebres guardadas para inspirarse
  boardNotes: BoardNote[] // notas fijadas en el Tablero (corcho)
  game: GameState
}
