// Sessão simulada: no lugar do Supabase Auth. Cada perfil de demonstração entra com um clique,
// sem senha. A sessão fica em sessionStorage, então fechar a aba encerra o acesso.
import { getDb, resetDb } from './db'
import type { Row } from './schema'

const SESSION_KEY = 'ih-demo-session'

export type PersonaId = 'funcionario' | 'gestor' | 'admin' | 'totem'

export const PERSONAS: Record<PersonaId, { label: string; home: string }> = {
  funcionario: { label: 'Funcionário', home: '/dashboard' },
  gestor: { label: 'Gestor', home: '/manager/dashboard' },
  admin: { label: 'Administrador', home: '/admin/dashboard' },
  totem: { label: 'Totem', home: '/totem/dashboard' },
}

// Usuários do seed que representam cada perfil
const PERSONA_LOOKUP: Record<PersonaId, { column: string; value: string }> = {
  funcionario: { column: 'email', value: 'ana.rocha@eurofarma.com' },
  gestor: { column: 'email', value: 'carlos.ferreira@eurofarma.com' },
  admin: { column: 'email', value: 'admin@eurofarma.com' },
  totem: { column: 'matricula', value: 'TOT001' },
}

export type MockSession = { access_token: string; user: { id: string; email: string | null } }
type AuthEvent = 'INITIAL_SESSION' | 'SIGNED_IN' | 'SIGNED_OUT'
type AuthListener = (event: AuthEvent, session: MockSession | null) => void

const listeners = new Set<AuthListener>()

function store(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage
  } catch {
    return null
  }
}

function findUser(id: string | null): Row | undefined {
  return id ? getDb().users.find((u) => u.id === id) : undefined
}

export function getSessionUserId(): string | null {
  return store()?.getItem(SESSION_KEY) ?? null
}

export function currentSession(): MockSession | null {
  const user = findUser(getSessionUserId())
  return user ? { access_token: 'demo', user: { id: String(user.id), email: (user.email as string | null) ?? null } } : null
}

function setSession(userId: string | null) {
  const s = store()
  if (!s) return
  if (userId) s.setItem(SESSION_KEY, userId)
  else s.removeItem(SESSION_KEY)
}

function notify(event: AuthEvent) {
  const session = currentSession()
  listeners.forEach((l) => l(event, session))
}

export function personaUserId(persona: PersonaId): string | null {
  const { column, value } = PERSONA_LOOKUP[persona]
  const user = getDb().users.find((u) => u[column] === value)
  return user ? String(user.id) : null
}

/** Entra como um perfil de demonstração e devolve a rota inicial dele. */
export function loginAs(persona: PersonaId): string {
  const id = personaUserId(persona)
  const s = store()
  s?.removeItem('viewing_as')
  if (persona === 'totem') {
    if (id) s?.setItem('totem_user_id', id)
    setSession(null)
    notify('SIGNED_OUT')
  } else {
    s?.removeItem('totem_user_id')
    setSession(id)
    notify('SIGNED_IN')
  }
  return PERSONAS[persona].home
}

/** Perfil de demonstração ativo, ou null fora de uma sessão. */
export function currentPersona(): PersonaId | null {
  const s = store()
  if (s?.getItem('totem_user_id')) return 'totem'
  const user = findUser(getSessionUserId())
  if (!user) return null
  return user.role === 'admin' ? 'admin' : user.role === 'gestor' ? 'gestor' : 'funcionario'
}

/** Apaga as ações feitas na demonstração e a sessão. */
export function resetDemo() {
  resetDb()
  const s = store()
  s?.removeItem(SESSION_KEY)
  s?.removeItem('totem_user_id')
  s?.removeItem('viewing_as')
}

export const mockAuth = {
  async getSession() {
    return { data: { session: currentSession() }, error: null }
  },
  async getUser() {
    const session = currentSession()
    return session
      ? { data: { user: session.user }, error: null }
      : { data: { user: null }, error: { name: 'AuthSessionMissingError', message: 'Auth session missing!' } }
  },
  async signOut() {
    setSession(null)
    notify('SIGNED_OUT')
    return { error: null }
  },
  async signInWithPassword({ email }: { email: string; password?: string }) {
    const user = getDb().users.find((u) => u.email === email)
    if (!user) return { data: { user: null, session: null }, error: { message: 'Invalid login credentials' } }
    setSession(String(user.id))
    notify('SIGNED_IN')
    return { data: { user: currentSession()?.user ?? null, session: currentSession() }, error: null }
  },
  onAuthStateChange(callback: AuthListener) {
    listeners.add(callback)
    queueMicrotask(() => callback('INITIAL_SESSION', currentSession()))
    return { data: { subscription: { unsubscribe: () => listeners.delete(callback) } } }
  },
}
