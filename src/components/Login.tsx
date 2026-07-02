import { useState } from 'react'
import { LogIn, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

export function Login() {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const submit = async () => {
    if (!supabase || !email.trim() || !pass) {
      setMsg('Escribe tu correo y contraseña.')
      return
    }
    setLoading(true)
    setMsg('')
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: pass,
    })
    setLoading(false)
    if (error) setMsg('Correo o contraseña incorrectos.')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20 }}>
      <div className="aurora"><div className="aurora-3" /></div>
      <div className="card" style={{ width: '100%', maxWidth: 400, padding: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div className="brand-logo">⚔️</div>
          <div>
            <div className="brand-name" style={{ fontSize: 20 }}>Vida Quest</div>
            <div className="brand-sub">Sube de nivel tu vida</div>
          </div>
        </div>
        <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 19, margin: '18px 0 4px' }}>
          Entra a tu cueva
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20 }}>
          Tus datos se sincronizan de forma privada entre tus dispositivos.
        </div>

        <div className="field">
          <label>Correo</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" autoFocus />
        </div>
        <div className="field">
          <label>Contraseña</label>
          <input
            className="input"
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="Tu contraseña"
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </div>

        {msg && <div style={{ color: 'var(--rose)', fontSize: 13, marginBottom: 12 }}>{msg}</div>}

        <button className="btn btn-primary" style={{ width: '100%' }} onClick={submit} disabled={loading}>
          {loading ? <Loader2 size={16} className="spin" /> : <LogIn size={16} />}
          Iniciar sesión
        </button>
      </div>
    </div>
  )
}
