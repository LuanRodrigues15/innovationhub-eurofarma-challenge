'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  getTotemUserProfile,
  getAuthenticatedUserProfile,
  type UserProfile,
} from '@/services/auth.service'

type UseUserResult = {
  user: UserProfile | null
  loading: boolean
  error: string | null
}

let cachedUser: UserProfile | null = null
let cachedError: string | null = null
let cachedMode: string | null = null
let inFlight: Promise<{ data: UserProfile | null; error: string | null; mode: string }> | null =
  null

// Keeps a single Supabase auth listener active for the entire page session.
// When a different user logs in or out, the listener clears the module cache
// and broadcasts an event so all mounted useUser() consumers re-fetch.
let authListenerInitialized = false
const CACHE_INVALIDATE_EVENT = 'ih:user-cache-invalidated'

function dispatchInvalidate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CACHE_INVALIDATE_EVENT))
  }
}

function initAuthListener() {
  if (authListenerInitialized || typeof window === 'undefined') return
  authListenerInitialized = true

  const supabase = createClient()
  // The first event is always the current session restore — skip it.
  // Only subsequent SIGNED_IN (new user) / SIGNED_OUT events should bust the cache.
  let initialFired = false

  supabase.auth.onAuthStateChange((event) => {
    if (!initialFired) {
      initialFired = true
      return
    }
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
      clearUserCache()
    }
  })
}

export function clearUserCache() {
  cachedUser = null
  cachedError = null
  cachedMode = null
  inFlight = null
  dispatchInvalidate()
}

function getClientMode() {
  if (typeof window === 'undefined') return 'auth'

  const totemUserId = sessionStorage.getItem('totem_user_id')
  return totemUserId ? `totem:${totemUserId}` : 'auth'
}

async function fetchUserForMode(mode: string) {
  if (mode.startsWith('totem:')) {
    const userId = mode.replace('totem:', '')
    const result = await getTotemUserProfile(userId)
    return { ...result, mode }
  }

  const result = await getAuthenticatedUserProfile()
  return { ...result, mode }
}

export function useUser(): UseUserResult {
  const initialMode = getClientMode()
  const hasCachedResult = cachedMode === initialMode && (cachedUser !== null || cachedError !== null)
  const [user, setUser] = useState<UserProfile | null>(hasCachedResult ? cachedUser : null)
  const [loading, setLoading] = useState(!hasCachedResult)
  const [error, setError] = useState<string | null>(hasCachedResult ? cachedError : null)
  const [tick, setTick] = useState(0)

  // Initialize the singleton Supabase auth listener on first render.
  useEffect(() => {
    initAuthListener()
  }, [])

  // Re-fetch whenever the cache is externally invalidated (logout, session change).
  useEffect(() => {
    function onInvalidate() {
      setTick((t) => t + 1)
    }
    window.addEventListener(CACHE_INVALIDATE_EVENT, onInvalidate)
    return () => window.removeEventListener(CACHE_INVALIDATE_EVENT, onInvalidate)
  }, [])

  useEffect(() => {
    let active = true
    const mode = getClientMode()

    if (cachedMode === mode && (cachedUser !== null || cachedError !== null)) {
      setUser(cachedUser)
      setError(cachedError)
      setLoading(false)
      return
    }

    setLoading(true)

    if (!inFlight || cachedMode !== mode) {
      cachedMode = mode
      inFlight = fetchUserForMode(mode)
    }

    inFlight
      .then((result) => {
        if (result.mode !== mode) return

        cachedUser = result.data
        cachedError = result.error
        cachedMode = result.mode

        if (!active) return
        setUser(result.data)
        setError(result.error)
        setLoading(false)
      })
      .catch(() => {
        cachedUser = null
        cachedError = 'Erro ao buscar dados do usuário.'
        cachedMode = mode

        if (!active) return
        setUser(null)
        setError(cachedError)
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [tick])

  return { user, loading, error }
}
