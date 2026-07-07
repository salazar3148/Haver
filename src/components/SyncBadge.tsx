import { Cloud, CloudOff, Check, Loader2, AlertTriangle, LogOut, ArrowUp, ArrowDown } from 'lucide-react'
import { supabase, supabaseEnabled } from '../lib/supabase'
import { useSync, pushNow, pullRemote, stopSync } from '../store/useSync'

export function SyncBadge({ collapsed }: { collapsed?: boolean }) {
  const { status, email } = useSync()
  if (!supabaseEnabled) return null

  const meta = {
    idle: { icon: <Cloud size={14} />, text: 'Conectado', color: 'var(--muted)' },
    saving: { icon: <Loader2 size={14} className="spin" />, text: 'Sincronizando…', color: 'var(--amber)' },
    saved: { icon: <Check size={14} />, text: 'Guardado en la nube', color: 'var(--emerald)' },
    offline: { icon: <CloudOff size={14} />, text: 'Sin conexión', color: 'var(--rose)' },
    error: { icon: <AlertTriangle size={14} />, text: 'Error de sync', color: 'var(--rose)' },
  }[status]

  const logout = async () => {
    await supabase?.auth.signOut()
    stopSync()
  }

  if (collapsed) {
    return (
      <div className="sync-badge collapsed" title={`${meta.text} · ${email ?? 'Cuenta'}`}>
        <button className="sync-mini" style={{ color: meta.color }} onClick={() => pushNow()}>
          {meta.icon}
        </button>
        <button className="sync-mini" title="Cerrar sesión" onClick={logout}>
          <LogOut size={13} />
        </button>
      </div>
    )
  }

  return (
    <div className="sync-badge">
      <div className="sync-row" style={{ color: meta.color }}>
        {meta.icon}
        <span style={{ flex: 1 }}>{meta.text}</span>
        <button className="sync-mini" title="Subir ahora" onClick={() => pushNow()}><ArrowUp size={13} /></button>
        <button className="sync-mini" title="Bajar de la nube" onClick={() => pullRemote(true)}><ArrowDown size={13} /></button>
      </div>
      <div className="sync-foot">
        <span title={email ?? ''}>{email ?? 'Cuenta'}</span>
        <button className="sync-mini" title="Cerrar sesión" onClick={logout}><LogOut size={13} /></button>
      </div>
    </div>
  )
}
