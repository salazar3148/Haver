# Vida Quest — Contexto completo del proyecto (para continuar en otra sesión)

> Pega este documento al inicio de una nueva sesión. Describe TODO lo construido:
> propósito, stack, arquitectura, modelo de datos, cada pantalla/feature, el
> sistema de diseño (paleta, temas, CSS), gamificación, sincronización en la nube
> y convenciones. El objetivo es que un asistente pueda continuar el desarrollo
> sin perder contexto.

---

## 1. Qué es

**Vida Quest** es una app web personal (un solo dueño, multi-dispositivo) de
**hábitos, productividad y finanzas**, fuertemente **gamificada** y basada en
**psicología/ciencia del comportamiento**. La filosofía: no solo *medir*, sino
*hacer actuar* — planear, empezar (vencer la procrastinación), automatizar con
intenciones, recompensar y revisar. Está en **español (es-CO)**, moneda **COP**.

Tono de producto: moderno, atrevido, "videojuego". Tema visual actual: **"Cueva"**
(negro + gris moderno + rojo de poder).

El usuario es de Colombia, valora: diseño apoteósico, interactividad, que todo
esté **conectado entre componentes**, y potenciar sus ideas añadiéndoles valor.

---

## 2. Stack y comandos

- **React 18 + TypeScript + Vite 5**
- **Zustand 5** con middleware `persist` (estado de negocio en `localStorage`, clave `vida-quest-v1`, **version: 10** con migraciones)
- **react-router-dom 6** con `HashRouter`
- **Recharts 2** (gráficos)
- **lucide-react** (íconos)
- **@supabase/supabase-js** (sync en la nube + auth, opcional por env vars)
- Fuentes: **Sora** (títulos) e **Inter** (texto) desde Google Fonts en `index.html`.

Comandos: `npm run dev`, `npm run build` (corre `tsc -b && vite build`).
El proyecto está en `c:\Users\DELLPHOTO\Desktop\Proyectos\Tracker` (Windows, cmd).

Reglas de TS estrictas: `noUnusedLocals`, `noUnusedParameters` activos → no dejar
imports/variables sin usar o el build falla. Siempre correr `npm run build` al final.

---

## 3. Estructura de archivos (src/)

```
src/
  main.tsx                # entry; aplica tema antes del primer render (anti-flash)
  App.tsx                 # auth gate (Supabase) + Shell con rutas + XpWidget exportado
  index.css               # TODO el CSS (design system completo, ~1500+ líneas)
  vite-env.d.ts
  lib/
    supabase.ts           # cliente Supabase (se activa solo si hay env vars) + PERSIST_KEY
  store/
    types.ts              # TODAS las interfaces del dominio + AppState
    useStore.ts           # store Zustand principal (datos + acciones) + persist + migraciones
    useUi.ts              # store de preferencias UI (tema, acento, efectos, focusMin, breakMin) persistido (clave vida-quest-ui, version 1)
    useSync.ts            # estado y controlador de sincronización con Supabase
    gamification.ts       # XP, niveles, rangos, rachas, logros (ACHIEVEMENTS)
    goals.ts              # helpers de metas (árbol, cadencia, progreso, pendientes)
    habits.ts             # helpers de hábitos (fracción por subhábitos, días aplicables)
    stats.ts              # dayCompliance, campaignSeries, computeScore, habitStats, goalPunctuality
    themes.ts             # THEMES[] (paletas) + applyTheme()
  components/
    Sidebar.tsx           # navegación + mini-nivel + SyncBadge + botón tema
    ui.tsx                # Modal, Bar, Stat, Empty, Segmented (primitivos reutilizables)
    WheelPicker.tsx       # ruleta horizontal tipo "timón" 3D (drag + curvatura)
    ThemePicker.tsx       # modal de personalización (temas, acento, efectos)
    AchievementToast.tsx  # toasts de logros + subida de nivel + confeti
    Login.tsx             # pantalla de login/registro (Supabase)
    SyncBadge.tsx         # indicador de estado de sync + logout + subir/bajar
  pages/
    Dashboard.tsx         # resumen general (intención del día, stats, charts)
    Plan.tsx              # "Mi Día": planear hoy/mañana (intención, tareas, hábitos, metas, enfoque, ritual de cierre)
    Calendario.tsx        # calendario mensual con anillos de cumplimiento, eventos, objetivos(campañas), congelar
    Enfoque.tsx           # Pomodoro/deep work con ruleta de tiempo, auto-descanso, sonido, registro de distracción
    Tareas.tsx            # to-dos con Eisenhower + "Cómete la rana" + regla de 2 minutos
    Habitos.tsx           # hábitos con subhábitos, días aplicables, marcado SOLO de hoy, gráfico semana/mes
    Metas.tsx             # árbol de metas (única/diaria/semanal) + metas financieras (dinero)
    Finanzas.tsx          # ingresos/gastos/deudas/presupuestos + libro 2 columnas + consumibles + lista de compras
    Mejora.tsx            # registro de "tropiezos" (fallas) + analítica de detonantes
    Estadisticas.tsx      # puntualidad de metas, congelados, cumplimiento por hábito
    Logros.tsx            # "Jefe Final" (barra de logros) + marcador mes/año + trofeos + respaldo/export-import + reset
  utils/
    date.ts               # utilidades de fecha (ISO, semana lun-dom, mes, año, etc.)
    format.ts             # currency (COP), currencyShort (100k/1.2M), uid, clamp
    fx.ts                 # fireConfetti (canvas), useCountUp, playChime (jingle Zelda), scaleColor (verde→rojo)
```

Raíz: `index.html` (fuentes + título), `netlify.toml` (deploy SPA), `.env.example`,
`.gitignore`, `SUPABASE_SETUP.md` (guía paso a paso), `public/quest.svg` (favicon).

---

## 4. Modelo de datos (src/store/types.ts) — AppState completo

```ts
AppState = {
  transactions: Transaction[]   // {id,type:'ingreso'|'gasto',amount,category,description,date,createdAt}
  debts: Debt[]                 // {id,name,creditor,total,paid,dueDate,createdAt}
  budgets: Budget[]             // {id,category,limit,createdAt}  (presupuesto mensual por categoría)
  habits: Habit[]
  goals: Goal[]
  tasks: Task[]
  focus: FocusSession[]
  lapses: Lapse[]               // tropiezos/fallas
  plans: Record<string, DayPlan>// clave = fecha ISO
  supplies: Supply[]            // "cosas por acabarse" (consumibles)
  shopping: ShoppingItem[]      // lista de compras pendientes
  events: CalendarEvent[]
  campaigns: Campaign[]         // objetivos/retos de varios días
  frozenDays: string[]          // días congelados (viaje/ausencia) — no penalizan
  game: GameState               // {xp, achievements:string[], lastActiveDate}
}
```

Detalle de entidades clave:

```ts
Habit = {
  id, name, icon (emoji), color (hex), frequency:'diario'|'semanal',
  timeOfDay: ''|'manana'|'dia'|'tarde'|'noche',   // clasificación opcional
  targetPerWeek: number,
  days: number[],            // weekdays donde aplica; Lunes=0..Domingo=6; [] = todos
  subs: {id,name}[],         // sub-hábitos (ej. Mañana/Tarde/Noche)
  log: Record<string,string[]>, // fechaISO -> ids de subs cumplidos (hábito simple usa sub 'main')
  cue: string,               // intención de implementación ("cuándo y dónde")
  reward: string,            // recompensa inmediata
  createdAt
}

GoalType = 'finanzas'|'estudio'|'personal'
GoalCadence = 'unica'|'diaria'|'semanal'
Goal = {
  id, title, type, cadence, parentId? (árbol),
  startDate, target, current, unit, money:boolean (meta financiera en $),
  deadline, completions:string[] (periodos cumplidos: diaria=fechaISO, semanal=lunesISO),
  createdAt, completedAt?
}

Task = { id,title,important,urgent,isFrog,quickWin,estimate(pomodoros),done,date,createdAt,completedAt? }

FocusSession = { id,minutes,label,taskId?,focused:boolean,distraction?,date,createdAt }

Lapse = { id, area:'estudio'|'enfoque'|'habito'|'finanzas'|'alimentacion'|'sueno'|'general', trigger,note,date,hour(0-23),createdAt }

DayPlan = { date, intention, habitIds[], goalIds[], focusTarget(bloques), shutdown:boolean, createdAt }

Supply = { id,name,emoji,lastBought(ISO),durationDays,price,createdAt }  // endDate = lastBought + durationDays
ShoppingItem = { id,name,bought:boolean,createdAt }
CalendarEvent = { id,title,date,time('HH:MM'|''),type:'reunion'|'cita'|'tarea'|'evento',note,done,createdAt }
Campaign = { id,title,emoji,color,startDate,endDate,habitIds[],goalIds[],createdAt }
```

---

## 5. Store principal (useStore.ts) — acciones

finanzas: `addTransaction, removeTransaction`; deudas: `addDebt, payDebt, removeDebt`;
presupuestos: `setBudget(category,limit) (upsert), removeBudget`;
hábitos: `addHabit, toggleHabit(id,date) (simple, usa sub 'main'), toggleHabitSub(id,date,subId), removeHabit, toggleFrozenDay(date), freezeRange(start,end,freeze)`;
metas: `addGoal, updateGoalProgress(id,amount), toggleGoalPeriod(id) (marca hoy/esta semana), removeGoal (cascada hijos)`;
tareas: `addTask, toggleTask, setFrog(id) (una rana por día), removeTask`;
enfoque: `addFocusSession (XP completo si focused, mitad si distraído)`;
plan: `setIntention, togglePlanHabit, togglePlanGoal, setFocusTarget, completeShutdown (+25XP)`;
consumibles: `addSupply, restockSupply(id) (resetea lastBought y registra gasto si price>0), removeSupply`;
compras: `addShoppingItem, toggleShoppingItem, removeShoppingItem, clearBoughtShopping`;
tropiezos: `addLapse, removeLapse`;
calendario: `addEvent, toggleEvent, removeEvent, addCampaign, removeCampaign`;
sistema: `importState(Partial<AppState>) (reemplaza todo), resetAll, _award(xp)`.

`checkAchievements()` se llama tras cambios relevantes; desbloquea logros (ya **no** dan XP).
Migraciones por versión (v2..v10) rellenan campos nuevos sin perder datos. **Al
agregar un campo a una entidad: subir `version` y añadir bloque `if (version < N)`.**

---

## 6. Gamificación (gamification.ts)

- **XP** por acción: `habitDone:15, txLog:5, debtPay:10, goalProgress:8, goalComplete:100, taskDone:12, frogDone:30, focusBlock:20 (por 25min), planDay:25`. (achievement: ya NO otorga XP.)
- **Niveles**: `xpForLevel(n)=round(100*n^1.5)` acumulativo; `getLevelInfo(xp)` → {level,current,needed,progress,totalXp}.
- **Rangos** (`rankName`): Novato→Aprendiz(3)→Aventurero(7)→Experto(12)→Veterano(20)→Maestro(30)→Leyenda(40).
- **Racha** (`computeStreak`): días consecutivos con algún hábito; cuenta `h.log`.
- **ACHIEVEMENTS**: ~25 logros con `check(state)` (hábitos, rachas, finanzas, deudas, metas, enfoque, tareas, intenciones, tropiezos, árbol de metas, presupuesto, tasa de ahorro, planificación, consumibles, metas financieras).
- Subir de nivel y desbloquear logro disparan **confeti** (fx.ts) + toast.

---

## 7. Helpers de cálculo

- **habits.ts**: `subCount`, `dayDone`, `dayFraction(h,date)` (0..1 según subs cumplidos), `isDayFull`, `isSubDone`, `weekdayIndex(iso)` (Lun=0), `habitAppliesOn(h,iso)` (según `days`). MAIN='main'.
- **goals.ts**: `periodKey`, `expectedPeriods`, `completedPeriods`, `pendingPeriods` (acumulado no cumplido), `doneCurrentPeriod`, `completionRate`, `childrenOf`, `rootGoals`, `descendantIds`, `isGoalDone` (recursivo en árbol), `goalProgress` (derivado de hijos o de la propia meta).
- **stats.ts**:
  - `dayCompliance(s,date)` → {pct, habitsDone/Total, goalsDone/Total, has}; respeta `frozenDays` y `habitAppliesOn`.
  - `campaignSeries(s,campaign)` → serie diaria de % para objetivos (usa hábitos/metas enlazados, o todos si no hay enlace), salta congelados.
  - `computeScore(s, periodDays)` → marcador por periodo (Hábitos/Tareas/Metas/Enfoque) con % realización y % fallas; hábitos por fracción y días aplicables/no congelados.
  - `habitStats(s,h)` → {total, completed, partial, notCompleted, frozen, pct, streak} histórico.
  - `goalPunctuality(s)` → {antes, enTiempo, despues, total} de metas únicas completadas (completedAt vs deadline).

---

## 8. Páginas / features (resumen funcional)

- **Dashboard**: banner de "Intención de hoy" (link a Plan), stats (Balance/Ingresos/Gastos en `currencyShort`, Racha), fila "Hoy" (enfoque min, tareas done/total, rana del día), gráfico de balance acumulado 14d (área), dona de gastos por categoría, metas en progreso (barras), hábitos de hoy, aviso "por acabarse pronto", deuda total.
- **Plan (Mi Día)**: toggle ☀️Hoy/🌙Mañana; intención; tareas del día (+ quick add, rana); ruleta de bloques de enfoque planeados; sub-metas diarias (commit/marcar); hábitos a comprometer (grid); ritual de cierre (+25XP + confeti). Todo enlaza al mismo estado.
- **Calendario**: grid mensual lun-dom; cada celda = anillo de cumplimiento (dayCompliance), barras de campañas activas (color), chips de eventos; click abre detalle del día (cumplimiento, intención, campañas, tareas, agenda + agregar evento, congelar día). Toolbar: navegación de mes, "Hoy", "Evento", "❄️ Congelar" (rango), "Objetivo". Objetivos (campañas) con color/emoji/fechas + **enlazar hábitos y metas**; al tocar un objetivo → modal con **gráfico de área día a día** (campaignSeries), % promedio, "Día X de Y", enlazados, eliminar. Días congelados con **franja diagonal helada**.
- **Enfoque**: temporizador circular (anillo) violeta(enfoque)/esmeralda(descanso); toggle de fase tipo "phase-toggle"; **WheelPicker** (ruleta timón) para Enfoque 20–90 min y Descanso 5–120 min (escala verde→rojo SOLO dentro de la ruleta); al terminar enfoque suena **jingle tipo Zelda** y **auto-inicia descanso**; al terminar el bloque pide resultado (Concentrado / Me distraje → crea Lapse); botón "Me distraje" a mitad; stats (enfoque hoy, calidad %, total h); gráfico 7 días; elegir tarea del día como foco. focusMin/breakMin se guardan en useUi.
- **Tareas**: matriz de Eisenhower (importante/urgente → "Hazlo ya / Planifícalo / Despáchalo / Opcional"), "Cómete la rana" 🐸 (1 por día, +30XP), regla de 2 minutos, estimación en pomodoros; secciones Hoy / Próximas / Completadas; barra de progreso del día.
- **Hábitos**: crear con ícono/color/frecuencia/momento del día/**días aplicables (Lu-Do)**/**subhábitos**/cue/recompensa. Marcado **SOLO de hoy** (chips de subhábitos o botón "Marcar hoy"); tira semanal **solo lectura** (✓ completo, % parcial ámbar, ❄️ congelado, – no aplica). Gráfico lineal acumulado (toggle Semana/Mes) por fracción; "Cumplimiento por hábito" %; agrupación por momento del día si hay clasificados.
- **Metas**: árbol (meta padre → sub-metas, conector visual `.tree-*`); cadencia **única** (objetivo numérico + barra +/-), **diaria/semanal** (marcar periodo, mini-semana, pendientes acumuladas 🔴); **metas financieras** (`money`) en COP con aporte y "faltan $X"; progreso de padre derivado de hijos; stats arriba (activas, cumplidas, pendientes acumuladas).
- **Finanzas** (mes seleccionable con ◀▶): stats (Balance/Ingresos/Gastos/Tasa de ahorro) en `currencyShort`; **Análisis** (promedio diario, mayor gasto, evaluación de ahorro); **Libro a 2 columnas**: Ingresos (verde, izquierda) | divisor | Gastos (rojo, derecha) con "+" para agregar en cada columna, **filtro por categoría**, totales vivos, borrar en hover; **Presupuestos** por categoría (barra verde/ámbar/rojo + excedente); gráfico Ingresos vs Gastos (últimos 6 meses); **Deudas** (abonar); **Cosas por acabarse** (consumibles con días restantes, "Compré" registra gasto); **Lista de compras** pendientes; movimientos del mes.
- **Mejora**: registrar tropiezos (área, detonante, nota; hora automática). Insights: área más vulnerable, momento de riesgo, detonante #1; gráficos por momento del día / día de la semana / por área; historial.
- **Estadísticas**: puntualidad de metas (antes/en tiempo/después + % puntual); días congelados (total/mes + advertencia si abusas); cumplimiento por hábito histórico (%, cumplidos/parciales/no cumplidos/total/congelados + racha).
- **Logros & Progreso**: **Jefe Final** (barra de vida = logros desbloqueados/total, avatar evoluciona 🐉→👹→😈→🏆); stats (Nivel, XP, Logros, Racha); **Marcador Mes/Año** con anillos de Realización (verde) y Fallas (rojo) + desglose por categoría + tropiezos; **Trofeos** (grid de logros); **Datos y respaldo** (exportar/importar JSON, usa `importState`); **Reiniciar** todo.

---

## 9. Sistema de diseño

### Filosofía visual
Oscuro, premium, "videojuego". Tarjetas con glassmorphism + **glow que sigue el
cursor** (`.card` usa `--mx/--my` actualizados por `useSpotlight` en App). **Aurora
animada** de fondo (3 orbes que derivan). Microinteracciones: hover lift, barras con
shimmer, modales con rebote, transición de página (`.route-fade` con blur+scale),
números animados (useCountUp), confeti en canvas.

### Tokens CSS (definidos en :root, sobreescritos por el tema activo vía applyTheme)
Estructura/medidas: `--radius:20px, --radius-sm:13px, --shadow, --shadow-glow`.
Color base (modo oscuro por defecto): `--bg, --bg-2, --panel, --panel-2, --panel-hover,
--border, --border-strong, --text, --muted, --faint`.
Acento/semánticos: `--violet (=primary), --violet-d, --cyan (=secondary), --primary,
--primary-2, --grad (linear primary→secondary), --grad-soft, --green/--emerald,
--red, --rose, --amber, --pink`. (Los **semánticos verde/rojo/ámbar NO cambian** con
el tema; el "primary" sí.)
`--bg-glow-1/2` alimentan la aurora. `[data-mode]` y `[data-theme]` en `<html>`.

### Temas (themes.ts) — `applyTheme(theme, accent?)` escribe los tokens
Lista `THEMES` (en orden, el primero es default): 
1. **cueva** 🕳️ (DEFAULT, modo dark): primary `#f5291f` (rojo lava), secondary `#7a0f0f`,
   bg `#08080a`, bg2 `#131315`, text `#eae7e8`, muted `#9c9398`, borderStrong rojo `rgba(245,41,31,.45)`,
   glows rojos. Ambiente extra en CSS: viñeta tipo túnel (`body::after`), brasa roja
   inferior, **textura de roca** (`body::before` con SVG feTurbulence, opacity .12),
   halo rojo en `.brand-logo`.
2. cosmos 🌌 (violeta `#8b5cf6` + cian `#22d3ee`) — era el default anterior.
3. sunset 🌅 (rosa/ámbar), 4. emerald 🌿 (verde/cian), 5. cyberpunk ⚡ (magenta/cian),
   6. gold 👑 (ámbar/naranja), 7. aurora ☀️ (modo **light**: define text/muted/panel/border claros).
`applyTheme` usa `shade()` (con clamp 0-255, OJO: antes había un bug de overflow que
generaba colores "arcoíris"; ya corregido). `--grad = linear-gradient(135deg, primary, secondary)`.
El acento personalizado (useUi.accent) sobrescribe el primary.
`useUi` (clave `vida-quest-ui`, version 1) guarda themeId/accent/effects/focusMin/breakMin;
su migrate v1 forzó `themeId='cueva'` una vez para estrenar el tema.

### Componentes/clases reutilizables (en index.css)
`.card, .card-title, .stat, .btn (+btn-primary/-danger/-ghost/-sm), .icon-btn, .chip
(+green/red/amber/violet), .bar/.bar-fill (+green/amber/pink), .segmented, .input/.select,
.field/.row, .modal/.overlay, .list/.list-row/.row-icon, .xp-widget/.level-badge,
.mini-level, .nav/.nav-item, .sidebar, .habit-card/.week-dots/.dot (+done/partial/today),
.tree-node/.tree-children (árbol metas), .dial (WheelPicker timón 3D), .phase-toggle,
.time-pill, .ledger (libro 2 columnas), .cal-grid/.cal-cell/.cal-ring (calendario),
.boss/.boss-bar (jefe final), .ring (anillos), .sync-badge, .toast, .aurora`.
Primitivos en `ui.tsx`: `Modal, Bar, Stat, Empty, Segmented`. Responsive con breakpoints
(sidebar horizontal en móvil, columnas a 1).

### fx.ts
`fireConfetti({count,colors,origin})` (canvas con física), `useCountUp(target,dur)`,
`playChime('win'|'soft')` (jingle Web Audio estilo Zelda), `scaleColor(v,min,max)` (HSL verde→rojo).

---

## 10. Moneda y formato
- `currency(n)` → COP completo (`Intl es-CO`, 0 decimales).
- `currencyShort(n)` → compacto: ≥100.000 = "$100k"/"$102.5k"; ≥1.000.000 = "$1.2M"; debajo, completo. Usado en stats, libro, presupuestos, listas.

---

## 11. Sincronización en la nube (Supabase) — implementada, requiere claves del usuario
- `src/lib/supabase.ts`: crea cliente solo si existen `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. `supabaseEnabled` controla todo. **Sin claves → app 100% local (sin login), como antes.**
- `src/store/useSync.ts`: `useSync` (status: idle/saving/saved/offline/error, email). `startSync(uid,email)`: descarga remoto (`pullRemote`, last-write-wins por `updated_at` vs marca local `vida-quest-lastmod`), se suscribe a `useStore` y sube con **debounce 1.5s** (`upload` hace `upsert` en tabla `app_state`), maneja online/offline. `pushNow`, `pullRemote(force)`, `stopSync`.
- `App.tsx`: si `supabaseEnabled` y no hay sesión → `<Login/>`; con sesión → arranca sync y muestra Shell. Si no está habilitado, va directo a la app.
- `SyncBadge` (en Sidebar): estado + correo + logout + ↑subir / ↓bajar.
- Tabla: `app_state(user_id uuid PK FK auth.users, data jsonb, updated_at timestamptz)` con **RLS** (select/insert/update solo `auth.uid()=user_id`). SQL y pasos en `SUPABASE_SETUP.md`.
- Deploy: `netlify.toml` (build `npm run build`, publish `dist`, redirect SPA → index.html). Variables `VITE_*` en Netlify. `.env` ignorado por git.
- **El usuario aún NO ha creado el proyecto Supabase ni desplegado** (esos pasos son manuales suyos). El código está listo para activarse al poner el `.env`.

---

## 12. Convenciones / cosas a recordar al continuar
- Todo en **español**, moneda **COP**, fechas ISO `yyyy-mm-dd`, semana **Lunes=0..Domingo=6**.
- Persistencia: al añadir campos a entidades, **subir version** en `useStore` persist y añadir migración; incluir el campo en `importState` y en el `exportData` de Logros.
- Mantener **conexión entre componentes** (el plan, calendario, enfoque, hábitos y metas comparten el mismo estado; cambios se reflejan en todas partes). Es el foco del usuario.
- `npm run build` debe pasar limpio (TS estricto). No dejar imports sin usar.
- El bundle ya supera 500kB (warning de Vite), no es error. Posible mejora futura: code-splitting.
- El usuario disfruta que se **potencien sus ideas** con extras útiles/modernos sin preguntar de más.

## 13. Ideas/pendientes sugeridos (backlog abierto)
- Editar hábito/meta existentes (hoy solo crear/borrar).
- Gastos recurrentes/suscripciones automáticas.
- Objetivos del calendario con racha (días consecutivos al 100%) y mensajes motivadores.
- Mini línea de tiempo de rangos congelados en Estadísticas.
- Reflexión diaria (journaling) como cierre de día.
- Code-splitting para reducir el bundle.
- (Usuario) Crear proyecto Supabase + `.env` + deploy en Netlify siguiendo `SUPABASE_SETUP.md`.

---

### Instrucción para el asistente en la nueva sesión
Continúa el desarrollo de Vida Quest respetando este contexto: stack React+TS+Vite+Zustand,
tema "Cueva" (negro/gris/rojo), español/COP, todo conectado, gamificado y basado en ciencia
del comportamiento. Antes de editar, revisa los archivos relevantes; corre `npm run build`
al terminar; sube `version` del persist al cambiar el modelo; y potencia las ideas del usuario
con valor añadido moderno e interactivo.
