import { create } from 'zustand'
import { supabase, supabaseEnabled, PERSIST_KEY } from '../lib/supabase'
import { useStore } from './useStore'

export type SyncStatus = 'idle' | 'saving' | 'saved' | 'offline' | 'error'

interface SyncState {
  status: SyncStatus
  lastSavedAt: number | null
  email: string | null
  set: (p: Partial<SyncState>) => void
}

export const useSync = create<SyncState>()((set) => ({
  status: 'idle',
  lastSavedAt: null,
  email: null,
  set: (p) => set(p),
}))

const LM_KEY = 'vida-quest-lastmod' // marca de tiempo del último cambio local

let userId: string | null = null
let unsub: (() => void) | null = null
let timer: number | null = null
let applyingRemote = false

const setStatus = (status: SyncStatus, extra: Partial<SyncState> = {}) =>
  useSync.getState().set({ status, ...extra })

const localState = (): Record<string, unknown> | null => {
  try {
    const raw = localStorage.getItem(PERSIST_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed.state ?? null
  } catch {
    return null
  }
}

async function upload() {
  if (!supabase || !userId) return
  if (!navigator.onLine) {
    setStatus('offline')
    return
  }
  const data = localState()
  if (!data) return
  setStatus('saving')
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('app_state')
    .upsert({ user_id: userId, data, updated_at: now })
  if (error) {
    setStatus('error')
    return
  }
  localStorage.setItem(LM_KEY, String(Date.parse(now)))
  setStatus('saved', { lastSavedAt: Date.now() })
}

function scheduleUpload() {
  if (timer) window.clearTimeout(timer)
  setStatus('saving')
  timer = window.setTimeout(upload, 1500)
}

/** Descarga el estado remoto y, según el más reciente, lo aplica o sube el local. */
export async function pullRemote(force = false) {
  if (!supabase || !userId) return
  setStatus('saving')
  const { data, error } = await supabase
    .from('app_state')
    .select('data, updated_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) {
    setStatus('error')
    return
  }
  if (data?.data) {
    const remoteTime = Date.parse(data.updated_at)
    const localLM = Number(localStorage.getItem(LM_KEY) || 0)
    if (force || remoteTime >= localLM) {
      applyingRemote = true
      try {
        useStore.getState().importState(data.data as never)
      } finally {
        applyingRemote = false
      }
      localStorage.setItem(LM_KEY, String(remoteTime))
      setStatus('saved', { lastSavedAt: Date.now() })
    } else {
      await upload()
    }
  } else {
    await upload() // no hay nada en la nube todavía: subimos lo local
  }
}

export async function pushNow() {
  await upload()
}

const onOnline = () => upload()
const onOffline = () => setStatus('offline')

export function startSync(uid: string, email: string | null) {
  if (!supabaseEnabled) return
  userId = uid
  useSync.getState().set({ email })
  pullRemote()
  unsub = useStore.subscribe(() => {
    if (applyingRemote) return
    localStorage.setItem(LM_KEY, String(Date.now()))
    scheduleUpload()
  })
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
}

export function stopSync() {
  unsub?.()
  unsub = null
  window.removeEventListener('online', onOnline)
  window.removeEventListener('offline', onOffline)
  userId = null
  useSync.getState().set({ status: 'idle', email: null })
}
