import { useMemo, useState } from 'react'
import { Trophy, RotateCcw, Award, Flame, Swords } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Modal, Segmented } from '../components/ui'
import { XpWidget } from '../App'
import {
  ACHIEVEMENTS,
  getLevelInfo,
  rankName,
  computeStreak,
} from '../store/gamification'
import { computeScore } from '../store/stats'
import { currentMonth, currentYear, currentMonthKey, monthLabelLong } from '../utils/date'

function Ring({ pct, color, value, label }: { pct: number; color: string; value: string; label: string }) {
  const R = 40
  const C = 2 * Math.PI * R
  return (
    <div className="ring">
      <svg width="96" height="96" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="48" cy="48" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="9" />
        <circle
          cx="48"
          cy="48"
          r={R}
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C - (pct / 100) * C}
          style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.22,1,0.36,1)', filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <div className="ring-center">
        <div className="ring-value" style={{ color }}>{value}</div>
        <div className="ring-label">{label}</div>
      </div>
    </div>
  )
}

export function Logros() {
  const state = useStore()
  const { game, habits, resetAll } = state
  const [confirm, setConfirm] = useState(false)
  const [period, setPeriod] = useState<'mes' | 'año'>('mes')
  const info = getLevelInfo(game.xp)
  const unlocked = game.achievements.length
  const streak = computeStreak(habits)

  const bossPct = Math.round((unlocked / ACHIEVEMENTS.length) * 100)
  const bossAvatar = bossPct >= 100 ? '🏆' : bossPct >= 67 ? '😈' : bossPct >= 34 ? '👹' : '🐉'

  const score = useMemo(
    () => computeScore(state, period === 'mes' ? currentMonth() : currentYear()),
    [state, period]
  )
  const periodLabel = period === 'mes' ? monthLabelLong(currentMonthKey()) : String(new Date().getFullYear())

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Logros & Progreso</div>
          <div className="page-sub">Derrota al jefe final desbloqueando todo tu potencial</div>
        </div>
        <XpWidget />
      </div>

      {/* Jefe final */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="boss">
          <div className="boss-avatar">{bossAvatar}</div>
          <div className="boss-info">
            <div className="boss-name">
              <Swords size={18} style={{ color: 'var(--violet)' }} />
              Jefe Final: Tu Mejor Versión
            </div>
            <div className="boss-sub">
              {bossPct >= 100
                ? '¡Lo derrotaste! Eres imparable 🎉'
                : 'Cada logro desbloqueado le baja la vida. Complétalos todos para vencerlo.'}
            </div>
            <div className="boss-bar">
              <div className="boss-fill" style={{ width: `${Math.max(4, bossPct)}%` }} />
              <div className="boss-hp-text">
                {unlocked} / {ACHIEVEMENTS.length} logros · {bossPct}% derrotado
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid cols-4" style={{ marginBottom: 18 }}>
        <div className="card stat" style={{ ['--accent' as string]: '#8b5cf6' }}>
          <div className="stat-label">Nivel</div>
          <div className="stat-value">{info.level}</div>
          <div className="stat-sub">{rankName(info.level)}</div>
          <div className="stat-icon" style={{ background: '#8b5cf622', color: '#8b5cf6' }}><Award size={20} /></div>
        </div>
        <div className="card stat" style={{ ['--accent' as string]: '#22d3ee' }}>
          <div className="stat-label">XP total</div>
          <div className="stat-value">{game.xp}</div>
          <div className="stat-icon" style={{ background: '#22d3ee22', color: '#22d3ee' }}>⚡</div>
        </div>
        <div className="card stat" style={{ ['--accent' as string]: '#fbbf24' }}>
          <div className="stat-label">Logros</div>
          <div className="stat-value">{unlocked}/{ACHIEVEMENTS.length}</div>
          <div className="stat-icon" style={{ background: '#fbbf2422', color: '#fbbf24' }}><Trophy size={20} /></div>
        </div>
        <div className="card stat" style={{ ['--accent' as string]: '#fb7185' }}>
          <div className="stat-label">Racha</div>
          <div className="stat-value">{streak}🔥</div>
          <div className="stat-icon" style={{ background: '#fb718522', color: '#fb7185' }}><Flame size={20} /></div>
        </div>
      </div>

      {/* Marcador del periodo */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
          <div className="card-title" style={{ margin: 0 }}>📊 Marcador de {periodLabel}</div>
          <Segmented
            value={period}
            onChange={setPeriod}
            options={[{ value: 'mes', label: 'Mes' }, { value: 'año', label: 'Año' }]}
          />
        </div>

        {score.total === 0 ? (
          <div style={{ color: 'var(--muted)', fontSize: 14, padding: '10px 0' }}>
            Aún no hay datos suficientes en este periodo. Completa hábitos, tareas, metas o sesiones de enfoque.
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', marginBottom: 22 }}>
              <div className="ring-wrap">
                <Ring pct={score.realizacion} color="#34d399" value={`${score.realizacion}%`} label="Realización" />
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>Cumpliste</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>{score.done} de {score.total} objetivos</div>
                </div>
              </div>
              <div className="ring-wrap">
                <Ring pct={score.fallas} color="#fb7185" value={`${score.fallas}%`} label="Fallas" />
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>Pendiente</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>{score.total - score.done} sin completar</div>
                </div>
              </div>
              {score.lapses > 0 && (
                <div className="ring-wrap">
                  <div style={{ fontSize: 44 }}>🔍</div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{score.lapses} tropiezos</div>
                    <div style={{ fontSize: 13, color: 'var(--muted)' }}>registrados este periodo</div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {score.cats.filter((c) => c.total > 0).map((c) => {
                const pct = Math.round((c.done / c.total) * 100)
                return (
                  <div key={c.key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                      <span style={{ fontWeight: 600 }}>{c.emoji} {c.key}</span>
                      <span style={{ color: 'var(--muted)' }}>{c.done}/{c.total} · {pct}%</span>
                    </div>
                    <div className="bar">
                      <div className="bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Trofeos */}
      <div className="card">
        <div className="card-title"><Trophy size={16} /> Trofeos desbloqueados</div>
        <div className="grid cols-3">
          {ACHIEVEMENTS.map((a) => {
            const got = game.achievements.includes(a.id)
            return (
              <div key={a.id} className={`ach ${got ? 'unlocked' : ''}`}>
                <div className="ach-icon">{a.icon}</div>
                <div>
                  <div className="ach-name">{a.name}</div>
                  <div className="ach-desc">{a.desc}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <button className="btn btn-danger" onClick={() => setConfirm(true)}>
          <RotateCcw size={16} /> Reiniciar todos los datos
        </button>
      </div>

      <Modal open={confirm} onClose={() => setConfirm(false)} title="¿Reiniciar todo?">
        <p style={{ color: 'var(--muted)', marginBottom: 18, lineHeight: 1.5 }}>
          Esto borrará permanentemente tus finanzas, hábitos, metas, XP y logros. Esta acción no se puede deshacer.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn" style={{ flex: 1 }} onClick={() => setConfirm(false)}>Cancelar</button>
          <button
            className="btn btn-danger"
            style={{ flex: 1 }}
            onClick={() => { resetAll(); setConfirm(false) }}
          >
            Sí, borrar todo
          </button>
        </div>
      </Modal>
    </>
  )
}
