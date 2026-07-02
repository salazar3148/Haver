import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// La nube se activa solo si hay claves configuradas. Sin ellas, la app
// funciona igual que siempre (100% local con localStorage).
export const supabaseEnabled = Boolean(url && anonKey)

export const supabase: SupabaseClient | null = supabaseEnabled
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null

// Nombre de la clave donde zustand-persist guarda el estado local.
export const PERSIST_KEY = 'vida-quest-v1'
