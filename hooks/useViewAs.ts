'use client'

import { useEffect, useState } from 'react'

type ViewAsRole = 'funcionario' | 'gestor' | 'admin' | null
type ConcreteViewAsRole = Exclude<ViewAsRole, null>

const VIEW_AS_STORAGE_KEY = 'viewing_as'
const VIEW_AS_ROLES = ['funcionario', 'gestor', 'admin'] as const

type UseViewAsResult = {
  viewingAs: ViewAsRole
  setViewingAs: (role: ConcreteViewAsRole) => void
  clearViewAs: () => void
}

function isViewAsRole(value: string | null): value is ConcreteViewAsRole {
  return VIEW_AS_ROLES.includes(value as ConcreteViewAsRole)
}

function readStoredRole(): ViewAsRole {
  if (typeof window === 'undefined') return null

  const stored = sessionStorage.getItem(VIEW_AS_STORAGE_KEY)
  if (isViewAsRole(stored)) return stored

  if (stored) sessionStorage.removeItem(VIEW_AS_STORAGE_KEY)
  return null
}

export function useViewAs(): UseViewAsResult {
  const [viewingAs, setViewingAsState] = useState<ViewAsRole>(() => readStoredRole())

  useEffect(() => {
    setViewingAsState(readStoredRole())
  }, [])

  function setViewingAs(role: ConcreteViewAsRole) {
    sessionStorage.setItem(VIEW_AS_STORAGE_KEY, role)
    setViewingAsState(role)
  }

  function clearViewAs() {
    sessionStorage.removeItem(VIEW_AS_STORAGE_KEY)
    setViewingAsState(null)
  }

  return { viewingAs, setViewingAs, clearViewAs }
}
