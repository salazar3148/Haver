# Haver — Contexto completo del proyecto (para continuar en otra sesión)

> Pega este documento al inicio de una nueva sesión. Describe TODO lo construido:
> propósito, stack, arquitectura, modelo de datos, cada pantalla/feature, el
> sistema de diseño (paleta, temas, CSS), gamificación, sincronización en la nube
> y convenciones. El objetivo es que un asistente pueda continuar el desarrollo
> sin perder contexto.

---

## 1. Qué es

**Haver** es una app web personal (un solo dueño, multi-dispositivo) de
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
- **Zustand 5** con middleware `persist` (estado de negocio en `localStorage`, clave `vida-quest-v1`, **version: 13** con migraciones)
- **react-router-dom 6** con `HashRouter`
- **Recharts 2** (gráficos)
- **lucide-react** (íconos)
- **@supabase/supabase-js** (sync en la nube + auth, opcional por env vars)
- Fuentes: **Sora** (títulos) e **Inter** (texto) desde Google Fonts en `index.html`.

Comandos: `npm run dev`, `npm run build` (corre `tsc -b && vite build`).
El proyecto está en `c:\Users\DELLPHOTO\Desktop\Proyectos\Tracker` (Windows, cmd).

**Ya desplegado:** repo GitHub `salazar3148/Haver` (rama `main`) → **Netlify** con
deploy continuo. Datos sincronizados en la nube con **Supabase** (Postgres + Auth).
Ver sección 11 para el detalle.

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
    gamification.ts       # XP, niveles, rangos, rachas, logros (ACHIEVEMENTS) — ver regla de oro §6.1
    goals.ts              # helpers de metas (árbol, cadencia, progreso, pendientes)
    habits.ts             # helpers de hábitos (fracción por subhábitos, días aplicables)
    stats.ts              # dayCompliance, campaignSeries, computeScore, habitStats, goalPunctuality
    themes.ts             # THEMES[] (paletas) + applyTheme()
    lapses.ts             # metadata compartida de áreas de tropiezo (LAPSE_AREAS, lapseAreaMeta)
  components/
    Sidebar.tsx           # navegación + mini-nivel + SyncBadge + botón tema
    ui.tsx                # Modal, Bar, Stat, Empty, Segmented (primitivos reutilizables)
    WheelPicker.tsx       # ruleta horizontal tipo "timón" 3D (drag + curvatura)
    ThemePicker.tsx       # modal de personalización (temas, acento, efectos)
    AchievementToast.tsx  # toasts de logros + subida de nivel + confeti
    Login.tsx             # pantalla de login/registro (Supabase)
    SyncBadge.tsx         # indicador de estado de sync + logout + subir/bajar
    LapseModal.tsx        # modal reutilizable para registrar un tropiezo (usado desde Hábitos, Enfoque, Calendario)
  pages/
    Dashboard.tsx         # resumen general (intención del día, stats, charts)
    Plan.tsx              # "Mi Día": planear hoy/mañana (intención, tareas, hábitos, metas, enfoque, ritual de cierre)
    Calendario.tsx        # calendario mensual: anillos de cumplimiento, eventos, objetivos(campañas), congelar, tropiezos (celda "rota"/agrietada)
    Enfoque.tsx           # Pomodoro/deep work con ruleta de tiempo, auto-descanso, sonido, panel de tropiezos de hoy
    Tareas.tsx            # to-dos con Eisenhower + "Cómete la rana" + regla de 2 minutos
    Habitos.tsx           # hábitos con subhábitos, días aplicables, marcado SOLO de hoy, gráfico semana/mes, registrar tropiezo
    Metas.tsx             # árbol de metas (única/diaria/semanal) + metas financieras (dinero)
    Finanzas.tsx          # ingresos/gastos/deudas/presupuestos + libro 2 columnas + consumibles + lista de compras
    Estadisticas.tsx      # puntualidad de metas, congelados, cumplimiento por hábito
    Recursos.tsx          # páginas web que aportan valor: título, URL, descripción y categoría
    Citas.tsx             # citas célebres guardadas para inspirarse: frase, autor, categoría, favoritas
    Logros.tsx            # "Jefe Final" (barra de logros) + marcador mes/año + trofeos (= mapa de funcionalidades) + reset
  utils/
    date.ts               # utilidades de fecha (ISO LOCAL del dispositivo — nunca UTC, ver nota abajo)
    format.ts             # currency (COP), currencyShort (100k/1.2M), uid, clamp
    fx.ts                 # fireConfetti (canvas), useCountUp, playChime (jingle Zelda), scaleColor (verde→rojo)
```

> **⚠️ Ya no existe la página "Mejora".** El registro de tropiezos se movió a un
> modal reutilizable (`LapseModal`) accesible desde **Hábitos** (botón "😵
> Registrar tropiezo"), y también desde **Enfoque** (panel "Tropiezos de hoy",
> útil mientras corre el temporizador) y desde el detalle del día en
> **Calendario**. El modelo `AppState.lapses` y sus acciones (`addLapse`,
> `removeLapse`) siguen igual; solo cambió DÓNDE se usan.
>
> **Fechas: nunca usar `Date.toISOString()` para "hoy".** Eso convierte a UTC y
> en Colombia (UTC-5) adelanta el día ~5 horas antes de medianoche real. Todas
> las fechas "hoy/ahora" deben construirse con los componentes LOCALES del
> dispositivo vía `toISO()`/`todayISO()` en `utils/date.ts`. Si en el futuro se
> necesita el equivalente para `hour`/`getHours()`, esos ya son locales por
> definición y no tienen este problema.

Raíz: `index.html` (fuentes + título), `netlify.toml` (deploy SPA), `.env.example`,
`.gitignore`, `SUPABASE_SETUP.md` (guía paso a paso), `public/haver.svg` (favicon/logo: monograma "H" en gradiente rojo lava con acento de chevron "sube de nivel").

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
  resources: Resource[]         // páginas web que aportan valor (recursos guardados)
  quotes: Quote[]                // citas célebres guardadas para inspirarse
  game: GameState               // {xp, achievements:string[], lastActiveDate, usedFeatures:string[]}
}
```

`game.usedFeatures` guarda ids de funciones sin rastro propio en `AppState`
(tema, sync en la nube, respaldo, reabastecer, etc.) que un logro necesita
comprobar. Se marca con `useStore().markFeatureUsed(id)`. **Ver sección 6.1:
regla de oro — toda funcionalidad debe tener su logro.**

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
Resource = { id,title,url,description,category(string libre),createdAt } // "Recursos": páginas web de valor
Quote = { id,text,author,tag(string libre),favorite:boolean,createdAt } // "Citas": frases para inspirarse
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
recursos: `addResource, removeResource`;
citas: `addQuote, toggleQuoteFavorite, removeQuote`;
sistema: `importState(Partial<AppState>) (reemplaza todo), resetAll, _award(xp), markFeatureUsed(feature) (marca game.usedFeatures para logros de funciones sin datos propios; ver §6.1)`.

`checkAchievements()` se llama tras cambios relevantes; desbloquea logros (ya **no** dan XP).
**Toda acción que crea/modifica datos debe llamar `checkAchievements()` al final**
(fue una fuente real de bugs: `addLapse`, `addSupply`, `addEvent`, `addCampaign`,
`toggleFrozenDay`, `freezeRange` y `addShoppingItem` no la llamaban y sus logros
nunca se desbloqueaban — ya corregido, pero revísalo en cada acción nueva).
Migraciones por versión (v2..v13) rellenan campos nuevos sin perder datos. **Al
agregar un campo a una entidad: subir `version` y añadir bloque `if (version < N)`.**
v11 añadió `game.usedFeatures: string[]` para logros de funciones sin datos propios.
v12 añadió `resources: Resource[]` (páginas web de valor, sección Recursos).
v13 añadió `quotes: Quote[]` (citas célebres, sección Citas).

---

## 6. Gamificación (gamification.ts)

- **XP** por acción: `habitDone:15, txLog:5, debtPay:10, goalProgress:8, goalComplete:100, taskDone:12, frogDone:30, focusBlock:20 (por 25min), planDay:25`. (achievement: ya NO otorga XP.)
- **Niveles**: `xpForLevel(n)=round(100*n^1.5)` acumulativo; `getLevelInfo(xp)` → {level,current,needed,progress,totalXp}.
- **Rangos** (`rankName`): Novato→Aprendiz(3)→Aventurero(7)→Experto(12)→Veterano(20)→Maestro(30)→Leyenda(40).
- **Racha** (`computeStreak`): días consecutivos con algún hábito; cuenta `h.log`.
- **ACHIEVEMENTS**: ~38 logros con `check(state)` (hábitos, rachas, finanzas, deudas, metas, enfoque, tareas, intenciones, tropiezos, árbol de metas, presupuesto, tasa de ahorro, planificación, consumibles, metas financieras, calendario/objetivos, congelar días, lista de compras, sub-hábitos, regla de 2 minutos, matriz de Eisenhower, tema/acento, sync en la nube, respaldo). Ver **regla de oro** en la sección 6.1: toda función nueva necesita su logro.
- Subir de nivel y desbloquear logro disparan **confeti** (fx.ts) + toast.

### 6.1 REGLA DE ORO: toda funcionalidad tiene su logro ⚠️

**Esta es una convención obligatoria del proyecto, no opcional.** Cada vez que se
agrega o modifica una funcionalidad (una acción del store, una pantalla nueva, una
preferencia, una integración), **debe existir un logro en `ACHIEVEMENTS`** que la
represente. El propósito es doble: gamificar cada rincón de la app y, sobre todo,
que el usuario pueda ir a **Logros → Trofeos** y usarlo como un **mapa de
funcionalidades**: ver qué existe, para qué sirve (por el `desc`) y si ya lo probó.

Al implementar cualquier funcionalidad nueva, sigue este checklist:

1. **Identifica el momento clave** de esa funcionalidad (crear el primer X, usarla N
   veces, alcanzar un umbral, combinarla con otra cosa).
2. **¿El dato ya vive en `AppState`?** (una entidad en `store/types.ts`, un array,
   un contador). Si sí, escribe el `check(s) => ...` directamente sobre ese estado,
   igual que los logros existentes (ej. `s.events.length >= 1`).
3. **¿Es una función que NO deja rastro en `AppState`?** (cambiar de tema, activar
   la sincronización en la nube, exportar un respaldo, alternar una preferencia de
   `useUi`, etc.). Para estos casos usa el mecanismo de **flags de uso**:
   - Llama a `useStore.getState().markFeatureUsed('mi-feature-id')` (o el hook
     `markFeatureUsed` del store) en el punto donde el usuario usa la función.
   - Esto agrega el string a `game.usedFeatures: string[]` y dispara
     `checkAchievements()` automáticamente.
   - En `ACHIEVEMENTS`, comprueba con
     `check: (s) => (s.game.usedFeatures ?? []).includes('mi-feature-id')`.
   - Ejemplos ya implementados: `'theme'` (ThemePicker), `'cloud-sync'`
     (`startSync` en useSync.ts), `'backup-export'` (exportar en Logros.tsx),
     `'restock'` (reabastecer un consumible).
4. **Verifica que la acción del store llama a `checkAchievements()`** tras el
   `set(...)`. Es un error común olvidarlo (varias acciones antiguas — `addLapse`,
   `addSupply`, `addEvent`, `addCampaign`, `toggleFrozenDay`, `freezeRange`,
   `addShoppingItem` — no lo llamaban y sus logros nunca se desbloqueaban; ya se
   corrigió, pero revisa siempre las acciones nuevas).
5. **Escribe `name`, `desc` e `icon` pensando en que el usuario aprenda algo**: el
   `desc` debe explicar QUÉ hace la función, no solo "felicidades". Ejemplo bueno:
   *"Congela un día (viaje/ausencia) para que no penalice tus métricas"* — el
   usuario que nunca usó "congelar días" entiende de inmediato para qué sirve.
6. **Actualiza este CONTEXT.md** (la lista de convenciones y, si aplica, la sección
   de la página/feature) para que la próxima sesión sepa que el logro existe y por
   qué.

No hace falta pedir permiso para añadir el logro: es parte integral de construir
la funcionalidad, igual que subir `version` del persist al cambiar el modelo de
datos (sección 12).

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
- **Calendario**: grid mensual lun-dom; cada celda = anillo de cumplimiento (dayCompliance), barras de campañas activas (color), chips de eventos; click abre detalle del día (cumplimiento, intención, campañas, tareas, agenda + agregar evento, congelar día, **tropiezos del día** con opción de registrar/borrar). Toolbar: navegación de mes, "Hoy", "Evento", "❄️ Congelar" (rango), "Objetivo". Objetivos (campañas) con color/emoji/fechas + **enlazar hábitos y metas**; al tocar un objetivo → modal con **gráfico de área día a día** (campaignSeries), % promedio, "Día X de Y", enlazados, eliminar. Días congelados con **franja diagonal helada**.
  - **Días pasados "agrietados" según % de cumplimiento** (estilo "venom
    resquebrajándose"): `crackLevel(pct)` en Calendario.tsx devuelve 0-5 niveles
    (≥95% sin grietas, 80-94% leve, ... <20% crítico). El nivel se pasa como CSS
    vars `--crack-r`/`--crack-op` inline y clases `.has-crack.crack-N`. En
    `index.css`: grietas SVG enmascaradas por radio (`mask-image` radial, crecen
    con el nivel), manchas negras/violeta tipo simbionte "comiéndose" la carta
    (`::after`, `mix-blend-mode: multiply`), pulso de glow morado y —solo niveles
    4-5— un parpadeo tenue (`crackFlicker`). A menor cumplimiento, MUY más roto;
    cerca de 100% casi no se nota. Es intencionalmente notorio para desincentivar
    incumplir con solo mirar el calendario. El indicador 😵 de tropiezos es
    independiente y sigue apareciendo aparte (no se fusionó con las grietas).
    **Los días congelados NUNCA se agrietan** (`dc` es `null` si `frozen`, por lo
    que `level` queda en 0): un día congelado no penaliza, así que tampoco debe
    verse roto. Respeta `[data-reduce='true']` (sin animación si el usuario apagó
    efectos).
- **Enfoque**: temporizador circular (anillo) violeta(enfoque)/esmeralda(descanso); toggle de fase tipo "phase-toggle"; **WheelPicker** (ruleta timón) para Enfoque 20–90 min y Descanso 5–120 min (escala verde→rojo SOLO dentro de la ruleta); al terminar enfoque suena **jingle tipo Zelda** y **auto-inicia descanso**; al terminar el bloque pide resultado (Concentrado / Me distraje → crea Lapse); botón "Me distraje" a mitad; stats (enfoque hoy, calidad %, total h); gráfico 7 días; elegir tarea del día como foco; panel **"Tropiezos de hoy"** (lista en vivo mientras corre el timer, con botón para registrar uno vía `LapseModal`). focusMin/breakMin se guardan en useUi.
- **Tareas**: matriz de Eisenhower (importante/urgente → "Hazlo ya / Planifícalo / Despáchalo / Opcional"), "Cómete la rana" 🐸 (1 por día, +30XP), regla de 2 minutos, estimación en pomodoros; secciones Hoy / Próximas / Completadas; barra de progreso del día.
- **Hábitos**: crear con ícono/color/frecuencia/momento del día/**días aplicables (Lu-Do)**/**subhábitos**/cue (ya sin campo de "recompensa inmediata", se quitó del formulario). Cada tarjeta es el componente `HabitCard` (Habitos.tsx) con un mini-`Segmented` **Hoy/Ayer**: se puede marcar el día actual o **exclusivamente el día anterior** (hay hábitos que solo se confirman al día siguiente, ej. algo que se mide al despertar); si el día elegido está congelado o el hábito no aplica ese día, se avisa y no se puede marcar. Tira semanal **solo lectura** (✓ completo, % parcial ámbar, ❄️ congelado, – no aplica). Gráfico lineal acumulado (toggle Semana/Mes) por fracción; "Cumplimiento por hábito" %; agrupación por momento del día si hay clasificados. Botón **"😵 Registrar tropiezo"** junto a "Nuevo hábito" (abre `LapseModal`, área por defecto `habito`).
- **Metas**: árbol (meta padre → sub-metas, conector visual `.tree-*`); cadencia **única** (objetivo numérico + barra +/-), **diaria/semanal** (marcar periodo, mini-semana, pendientes acumuladas 🔴); **metas financieras** (`money`) en COP con aporte y "faltan $X"; progreso de padre derivado de hijos; stats arriba (activas, cumplidas, pendientes acumuladas).
- **Finanzas** (mes seleccionable con ◀▶): stats (Balance/Ingresos/Gastos/Tasa de ahorro) en `currencyShort`; **Análisis** (promedio diario, mayor gasto, evaluación de ahorro); **Libro a 2 columnas**: Ingresos (verde, izquierda) | divisor | Gastos (rojo, derecha) con "+" para agregar en cada columna, **filtro por categoría**, totales vivos, borrar en hover; **Presupuestos** por categoría (barra verde/ámbar/rojo + excedente); gráfico Ingresos vs Gastos (últimos 6 meses); **Deudas** (abonar); **Cosas por acabarse** (consumibles con días restantes, "Compré" registra gasto); **Lista de compras** pendientes; movimientos del mes.
- **Estadísticas**: puntualidad de metas (antes/en tiempo/después + % puntual); días congelados (total/mes + advertencia si abusas); cumplimiento por hábito histórico (%, cumplidos/parciales/no cumplidos/total/congelados + racha).
- **Recursos**: guarda páginas web que aportan valor (`Resource`: title, url, description, category libre). Tarjetas agrupadas por categoría (colores fijos para Productividad/Finanzas/Salud/Estudio/General, gris para categorías nuevas), muestra el hostname y botón "Visitar" (`target="_blank" rel="noopener noreferrer"`). El campo URL acepta sin `https://` (se normaliza al guardar). Es, en esencia, una libreta de marcadores curados con explicación de "para qué sirve" cada uno.
- **Citas**: guarda citas célebres para inspirarse (`Quote`: text, author, tag libre, favorite). "Cita del día" destacada arriba (aleatoria estable por día: prioriza favoritas si hay alguna, usa `Date.now()/86400000 % pool.length` para que no cambie durante el día). Modal "Sugeridas" con un banco fijo de ~8 frases (Aristóteles, Séneca, Epicteto, etc.) para agregar con un toque sin escribir nada. Filtro Todas/⭐Favoritas. Categorías con colores fijos (Disciplina, Estoicismo, Éxito, Motivación, Sabiduría, Perseverancia, General).
- **Logros & Progreso**: **Jefe Final** (barra de vida = logros desbloqueados/total, avatar evoluciona 🐉→👹→😈→🏆); stats (Nivel, XP, Logros, Racha); **Marcador Mes/Año** con anillos de Realización (verde) y Fallas (rojo) + desglose por categoría + tropiezos; **Trofeos** (grid de logros); **Reiniciar** todo.
  - Ya **no** existe exportar/importar respaldo manual (JSON) ni el logro
    "backup-master": todo se guarda automáticamente en Supabase (sección 11), así
    que un respaldo manual era redundante. `useStore.importState` **se conserva**
    porque `useSync.ts` lo sigue usando internamente para aplicar los datos que
    bajan de la nube (`pullRemote`) — no tocar esa función aunque ya no haya UI
    de "Importar" en Logros.

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
   halo rojo en `.brand-logo` (que ahora envuelve el `<img src="/haver.svg">`).
2. cosmos 🌌 (violeta `#8b5cf6` + cian `#22d3ee`) — era el default anterior.
3. sunset 🌅 (rosa/ámbar), 4. emerald 🌿 (verde/cian), 5. cyberpunk ⚡ (magenta/cian),
   6. gold 👑 (ámbar/naranja), 7. **eclipse** 🔮 (negro absoluto `#000000` + violeta
   `#a855f7`/`#6d28d9` asomando por las 4 esquinas vía `radial-gradient` en
   `body::after`, + polvo de estrellas sutil en `body::before`; bordes de `.card`
   con veta violeta tenue), 8. aurora ☀️ (modo **light**: define text/muted/panel/border claros).
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

## 11. Sincronización en la nube (Supabase) + Netlify — YA CONECTADO Y DESPLEGADO ✅

Objetivo cumplido: usar la app desde celular y PC indistintamente, con todo
sincronizado, publicada gratis en internet. Se eligió **Supabase** (Postgres + Auth
+ API en una sola pieza, consumible seguro y directo desde el navegador con la clave
pública) por costo $0 y mínimo montaje.

**Login de UN SOLO usuario (sin registro público).** Como la app es pública y tiene
datos personales (finanzas, hábitos), requiere sesión. **No hay pantalla de registro**:
el único usuario se crea manualmente en Supabase (Authentication → Users → Add user).
`Login.tsx` solo permite **iniciar sesión** (email + contraseña). La sesión es
persistente (`persistSession` + `autoRefreshToken`): se loguea una vez por dispositivo.

- `src/lib/supabase.ts`: crea el cliente solo si existen `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (`supabaseEnabled`). Sin claves, la app corre 100% local. Exporta `PERSIST_KEY = 'vida-quest-v1'`.
- `src/store/useSync.ts`: `useSync` (status: idle/saving/saved/offline/error, email). `startSync(uid,email)`: descarga remoto (`pullRemote`, **last-write-wins** comparando `updated_at` remoto vs marca local `vida-quest-lastmod`), se suscribe a `useStore` y sube con **debounce 1.5s** (`upload` → `upsert` en tabla `app_state`), maneja eventos online/offline. También `pushNow`, `pullRemote(force)`, `stopSync`.
- `App.tsx`: si `supabaseEnabled` y no hay sesión → `<Login/>`; con sesión → arranca sync y muestra el Shell. Sin Supabase → app directa (modo local).
- `SyncBadge` (barra lateral): muestra conectado/sincronizando/guardado/sin conexión/error + correo + **logout** + ↑subir / ↓bajar manuales.
- localStorage se conserva como **respaldo/offline**; cada cambio se guarda local al instante y se sube ~1.5s después. Sin internet, la app sigue 100% usable y sincroniza al reconectar.
- **Seguridad**: el frontend solo usa la **clave pública anon** (segura de exponer). La protección real es **RLS**: cada política de `app_state` exige `auth.uid() = user_id`. La clave secreta NUNCA va al frontend.
- **Base de datos**: tabla `app_state(user_id uuid PK FK auth.users, data jsonb, updated_at timestamptz)` con RLS activo (select/insert/update solo la propia fila). SQL en `supabase/schema.sql` (correr en Supabase SQL Editor). Guía en `SUPABASE_SETUP.md`.
- **Hosting**: **Netlify** con **deploy continuo desde GitHub** (repo `salazar3148/Haver`, rama `main`). `netlify.toml`: build `npm run build`, publish `dist`, redirect SPA → `index.html`. Variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` configuradas en Netlify. `.env` en `.gitignore`.

**Estado actual (funcionando):** cliente Supabase conectado y verificado; tabla
`app_state` con RLS; usuario único creado en Supabase; login + sync probados
(guarda local y sube/baja de Supabase); repo en GitHub con commit en `main`;
`netlify.toml` listo. La app **ya está desplegada** y accesible por URL pública.

> Nota de proyecto: el repositorio, despliegue y marca visible en la UI se llaman
> **Haver** (unificado). Logo: monograma "H" blanco sobre gradiente rojo lava
> (`--primary → --secondary` del tema Cueva) con un chevron superior que evoca
> "subir de nivel", en `public/haver.svg`, usado como favicon y en `.brand-logo`
> (Sidebar y Login). Las claves internas de `localStorage`
> (`vida-quest-v1`, `vida-quest-ui`, `vida-quest-lastmod`) **se dejaron sin cambiar**
> a propósito para no perder los datos ya guardados de los usuarios existentes.

---

## 12. Convenciones / cosas a recordar al continuar
- Todo en **español**, moneda **COP**, fechas ISO `yyyy-mm-dd`, semana **Lunes=0..Domingo=6**.
- **Toda funcionalidad nueva o existente debe tener un logro en `ACHIEVEMENTS`** (ver sección 6.1, regla de oro). No es opcional: es tan obligatorio como subir la versión del persist. Los Trofeos son el mapa de funcionalidades de la app.
- Fechas: **nunca `Date.toISOString()`** para "hoy"/fechas del usuario (adelanta el día por la conversión a UTC). Usar siempre `todayISO()`/`toISO()` de `utils/date.ts`, que usan los componentes LOCALES del dispositivo.
- Persistencia: al añadir campos a entidades, **subir version** en `useStore` persist y añadir migración; incluir el campo en `importState` y en el `exportData` de Logros.
- Toda acción del store que agrega/cambia datos relevantes para un logro debe terminar llamando `checkAchievements()`. Para funciones sin datos propios (preferencias, integraciones), usar `markFeatureUsed('id')` en vez de inventar un campo nuevo en `AppState`.
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
- Categorizar/filtrar los Trofeos en Logros por área (hábitos, finanzas, calendario, sistema...) ahora que hay ~38, para que sigan siendo fáciles de escanear como mapa de funcionalidades.
- Code-splitting para reducir el bundle.
- (Opcional) Unificar el nombre de marca a "Haver" en la UI si se desea.

---

### Instrucción para el asistente en la nueva sesión
Continúa el desarrollo de Haver respetando este contexto: stack React+TS+Vite+Zustand,
tema "Cueva" (negro/gris/rojo), español/COP, todo conectado, gamificado y basado en ciencia
del comportamiento. Antes de editar, revisa los archivos relevantes; corre `npm run build`
al terminar; sube `version` del persist al cambiar el modelo; y potencia las ideas del usuario
con valor añadido moderno e interactivo.
