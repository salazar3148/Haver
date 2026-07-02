import { useMemo, useState } from 'react'
import { Plus, Trash2, AlertTriangle, Lightbulb, Clock } from 'lucide-react'
import {
  BarChart,
  Bar as RBar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts'
import { useStore } from '../store/useStore'
import { Modal, Empty } from '../components/ui'
import { XpWidget } from '../App'
import { todayISO, shortLabel, fromISO } from '../utils/date'
import type { LapseArea } from '../store/types'

const AREAS: { value: LapseArea; label: string; emoji: string; color: string }[] = [
  { value: 'estudio', label: 'Estudio', emoji: '📚', color: '#fbbf24' },
  { value: 'enfoque', label: 'Enfoque', emoji: '🎧', color: '#8b5cf6' },
  { value: 'habito', label: 'Hábito', emoji: '🔁', color: '#22d3ee' },
  { value: 'alimentacion', label: 'Alimentación', emoji: '🍔', color: '#fb7185' },
  { value: 'sueno', label: 'Sueño', emoji: '😴', color: '#6366f1' },
  { value: 'finanzas', label: 'Finanzas', emoji: '💸', color: '#34d399' },
  { value: 'general', label: 'General', emoji: '⚠️', color: '#9a9ab4' },
]
const areaMeta = (a: LapseArea) => AREAS.find((x) => x.value === a)!

const PART_OF_DAY = [
  { label: 'Madrugada', from: 0, to: 6 },
  { label: 'Mañana', from: 6, to: 12 },
  { label: 'Tarde', from: 12, to: 18 },
  { label: 'Noche', from: 18, to: 24 },
]
const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do']

export function Mejora() {
  const { lapses, addLapse, removeLapse } = useStore()
  const [modal, setModal] = useState(false)
  const [area, setArea] = useState<LapseArea>('estudio')
  const [trigger, setTrigger] = useState('')
  const [note, setNote] = useState('')

  const save = () => {
    addLapse({
      area,
      trigger: trigger.trim() || 'Sin especificar',
      note: note.trim(),
      date: todayISO(),
      hour: new Date().getHours(),
    })
    setTrigger('')
    setNote('')
    setModal(false)
  }

  // ===== Analítica =====
  const byArea = useMemo(() => {
    return AREAS.map((a) => ({
      ...a,
      count: lapses.filter((l) => l.area === a.value).length,
    }))
      .filter((a) => a.count > 0)
      .sort((a, b) => b.count - a.count)
  }, [lapses])

  const byPart = useMemo(
    () =>
      PART_OF_DAY.map((p) => ({
        label: p.label,
        count: lapses.filter((l) => l.hour >= p.from && l.hour < p.to).length,
      })),
    [lapses]
  )

  const byWeekday = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0]
    lapses.forEach((l) => {
      const d = (fromISO(l.date).getDay() + 6) % 7 // lunes=0
      counts[d]++
    })
    return WEEKDAYS.map((w, i) => ({ label: w, count: counts[i] }))
  }, [lapses])

  const topTrigger = useMemo(() => {
    const map = new Map<string, number>()
    lapses.forEach((l) => map.set(l.trigger, (map.get(l.trigger) ?? 0) + 1))
    let best = ''
    let n = 0
    map.forEach((v, k) => {
      if (v > n) {
        n = v
        best = k
      }
    })
    return { trigger: best, count: n }
  }, [lapses])

  const worstArea = byArea[0]
  const worstPart = [...byPart].sort((a, b) => b.count - a.count)[0]

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Mejora</div>
          <div className="page-sub">
            Registra cuándo fallas para descubrir tus detonantes y patrones
          </div>
        </div>
        <XpWidget />
      </div>

      <div style={{ marginBottom: 18 }}>
        <button className="btn btn-primary" onClick={() => setModal(true)}>
          <Plus size={16} /> Registrar un tropiezo
        </button>
      </div>

      {lapses.length === 0 ? (
        <div className="card">
          <Empty
            emoji="🔍"
            text="Aún no registras tropiezos. Cada vez que falles o hagas algo contrario a tus metas, anótalo aquí: es el primer paso para mejorar."
          />
          <div className="card" style={{ background: 'var(--grad-soft)', marginTop: 8 }}>
            <div style={{ fontSize: 13, lineHeight: 1.6 }}>
              <b>🧠 Por qué sirve:</b> no se trata de castigarte, sino de observar sin juicio.
              Al ver el patrón (qué te detona, a qué hora, qué día) puedes diseñar una defensa
              concreta en vez de depender solo de la fuerza de voluntad.
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Insights */}
          <div className="grid cols-3" style={{ marginBottom: 18 }}>
            <div className="card" style={{ display: 'flex', gap: 13, alignItems: 'center' }}>
              <div style={{ fontSize: 30 }}>{worstArea?.emoji}</div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em' }}>
                  Área más vulnerable
                </div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{worstArea?.label}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{worstArea?.count} tropiezos</div>
              </div>
            </div>
            <div className="card" style={{ display: 'flex', gap: 13, alignItems: 'center' }}>
              <div style={{ fontSize: 30 }}>🕐</div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em' }}>
                  Momento de riesgo
                </div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{worstPart?.label}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{worstPart?.count} tropiezos</div>
              </div>
            </div>
            <div className="card" style={{ display: 'flex', gap: 13, alignItems: 'center' }}>
              <div style={{ fontSize: 30 }}>🎯</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em' }}>
                  Detonante #1
                </div>
                <div style={{ fontWeight: 800, fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {topTrigger.trigger}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{topTrigger.count} veces</div>
              </div>
            </div>
          </div>

          <div className="grid cols-2" style={{ marginBottom: 18 }}>
            <div className="card">
              <div className="card-title">
                <Clock size={16} /> Tropiezos por momento del día
              </div>
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={byPart} margin={{ top: 6, right: 6, bottom: 0, left: -22 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="label" stroke="#9a9ab4" fontSize={11} tickLine={false} />
                  <YAxis stroke="#9a9ab4" fontSize={11} allowDecimals={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#0e0e1b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12 }}
                    cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  />
                  <RBar dataKey="count" fill="#fb7185" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="card">
              <div className="card-title">
                <AlertTriangle size={16} /> Tropiezos por día de la semana
              </div>
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={byWeekday} margin={{ top: 6, right: 6, bottom: 0, left: -22 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="label" stroke="#9a9ab4" fontSize={11} tickLine={false} />
                  <YAxis stroke="#9a9ab4" fontSize={11} allowDecimals={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#0e0e1b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12 }}
                    cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  />
                  <RBar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid cols-2" style={{ alignItems: 'start' }}>
            <div className="card">
              <div className="card-title">📊 Por área</div>
              <ResponsiveContainer width="100%" height={Math.max(160, byArea.length * 46)}>
                <BarChart data={byArea} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <XAxis type="number" hide allowDecimals={false} />
                  <YAxis type="category" dataKey="label" stroke="#9a9ab4" fontSize={12} width={92} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#0e0e1b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12 }}
                    cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  />
                  <RBar dataKey="count" radius={[0, 6, 6, 0]}>
                    {byArea.map((a) => (
                      <Cell key={a.value} fill={a.color} />
                    ))}
                  </RBar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <div className="card-title">
                <Lightbulb size={16} /> Historial reciente
              </div>
              <div className="list">
                {lapses.slice(0, 25).map((l) => {
                  const m = areaMeta(l.area)
                  return (
                    <div className="list-row" key={l.id}>
                      <div className="row-icon" style={{ background: `${m.color}22`, color: m.color }}>
                        {m.emoji}
                      </div>
                      <div className="row-main">
                        <div className="row-title">{l.trigger}</div>
                        <div className="row-sub">
                          {m.label} · {shortLabel(l.date)} · {String(l.hour).padStart(2, '0')}:00
                          {l.note ? ` · ${l.note}` : ''}
                        </div>
                      </div>
                      <button className="icon-btn danger" onClick={() => removeLapse(l.id)}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Registrar tropiezo">
        <div className="field">
          <label>¿En qué área fallaste?</label>
          <select className="select" value={area} onChange={(e) => setArea(e.target.value as LapseArea)}>
            {AREAS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.emoji} {a.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>¿Qué lo detonó?</label>
          <input className="input" value={trigger} onChange={(e) => setTrigger(e.target.value)} placeholder="Ej. Redes sociales, cansancio, ansiedad" autoFocus />
        </div>
        <div className="field">
          <label>Nota (opcional)</label>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="¿Qué harás diferente la próxima vez?" />
        </div>
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={save}>
          <Plus size={16} /> Guardar
        </button>
      </Modal>
    </>
  )
}
