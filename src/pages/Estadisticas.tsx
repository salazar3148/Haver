import { useMemo } from 'react'
import { BarChart3, Snowflake, Trophy, Flame, CheckCircle2, Clock, AlarmClock } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Bar, Empty } from '../components/ui'
import { XpWidget } from '../App'
import { habitStats, goalPunctuality } from '../store/stats'
import { currentMonthKey } from '../utils/date'

export function Estadisticas() {
  const state = useStore()
  const { habits, frozenDays } = state

  const punct = useMemo(() => goalPunctuality(state), [state])
  const stats = useMemo(
    () => habits.map((h) => ({ h, st: habitStats(state, h) })).sort((a, b) => b.st.pct - a.st.pct),
    [habits, state]
  )
  const frozenMonth = frozenDays.filter((d) => d.slice(0, 7) === currentMonthKey()).length

  const barColor = (pct: number): 'green' | 'amber' | 'pink' =>
    pct >= 80 ? 'green' : pct >= 50 ? 'amber' : 'pink'

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Estadísticas</div>
          <div className="page-sub">Tu desempeño real: cumplimiento, puntualidad y constancia</div>
        </div>
        <XpWidget />
      </div>

      {/* Puntualidad de metas */}
      <div className="section-title"><Trophy size={16} /> Metas por puntualidad</div>
      <div className="grid cols-4" style={{ marginBottom: 22 }}>
        <div className="card stat" style={{ ['--accent' as string]: '#34d399' }}>
          <div className="stat-label">Antes de tiempo</div>
          <div className="stat-value" style={{ color: '#34d399' }}>{punct.antes}</div>
          <div className="stat-icon" style={{ background: '#34d39922', color: '#34d399' }}><CheckCircle2 size={18} /></div>
        </div>
        <div className="card stat" style={{ ['--accent' as string]: '#8b5cf6' }}>
          <div className="stat-label">En tiempo</div>
          <div className="stat-value" style={{ color: '#8b5cf6' }}>{punct.enTiempo}</div>
          <div className="stat-icon" style={{ background: '#8b5cf622', color: '#8b5cf6' }}><Clock size={18} /></div>
        </div>
        <div className="card stat" style={{ ['--accent' as string]: '#fb7185' }}>
          <div className="stat-label">Después de tiempo</div>
          <div className="stat-value" style={{ color: '#fb7185' }}>{punct.despues}</div>
          <div className="stat-icon" style={{ background: '#fb718522', color: '#fb7185' }}><AlarmClock size={18} /></div>
        </div>
        <div className="card stat" style={{ ['--accent' as string]: '#fbbf24' }}>
          <div className="stat-label">Metas completadas</div>
          <div className="stat-value">{punct.total}</div>
          <div className="stat-sub">
            {punct.total ? `${Math.round((punct.antes + punct.enTiempo) / punct.total * 100)}% puntual` : 'Sin metas aún'}
          </div>
          <div className="stat-icon" style={{ background: '#fbbf2422', color: '#fbbf24' }}><Trophy size={18} /></div>
        </div>
      </div>

      {/* Días congelados */}
      <div className="section-title"><Snowflake size={16} /> Días congelados</div>
      <div className="grid cols-3" style={{ marginBottom: 22 }}>
        <div className="card stat" style={{ ['--accent' as string]: '#60a5fa' }}>
          <div className="stat-label">Total congelados</div>
          <div className="stat-value">{frozenDays.length}</div>
          <div className="stat-icon" style={{ background: '#60a5fa22', color: '#60a5fa' }}>❄️</div>
        </div>
        <div className="card stat" style={{ ['--accent' as string]: '#60a5fa' }}>
          <div className="stat-label">Este mes</div>
          <div className="stat-value" style={{ color: frozenMonth > 6 ? 'var(--rose)' : undefined }}>{frozenMonth}</div>
          <div className="stat-icon" style={{ background: '#60a5fa22', color: '#60a5fa' }}>🗓️</div>
        </div>
        <div className="card" style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
            {frozenMonth > 6
              ? '⚠️ Llevas varios días congelados este mes. Úsalos solo cuando de verdad no puedas (viajes, salud), no para evitar el esfuerzo.'
              : 'Congelar es para días en que de verdad no puedes (viaje, ausencia). No penaliza, pero se cuenta para que sea honesto.'}
          </div>
        </div>
      </div>

      {/* Hábitos */}
      <div className="section-title"><BarChart3 size={16} /> Cumplimiento por hábito (histórico)</div>
      {habits.length === 0 ? (
        <div className="card"><Empty emoji="📊" text="Crea hábitos para ver tus estadísticas." /></div>
      ) : (
        <div className="grid cols-2">
          {stats.map(({ h, st }) => (
            <div className="card" key={h.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div className="habit-emoji" style={{ width: 42, height: 42, background: `${h.color}22`, color: h.color }}>{h.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{h.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Flame size={12} style={{ color: 'var(--amber)' }} /> Racha {st.streak} días
                  </div>
                </div>
                <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 22, color: st.pct >= 80 ? 'var(--emerald)' : st.pct >= 50 ? 'var(--amber)' : 'var(--rose)' }}>
                  {st.pct}%
                </div>
              </div>
              <Bar value={st.pct} max={100} color={barColor(st.pct)} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                <span className="chip green">✓ {st.completed} cumplidos</span>
                {st.partial > 0 && <span className="chip amber">◐ {st.partial} parciales</span>}
                <span className="chip red">✗ {st.notCompleted} no cumplidos</span>
                <span className="chip">📅 {st.total} días</span>
                {st.frozen > 0 && <span className="chip">❄️ {st.frozen} congelados</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
