'use client'

import { useEffect, useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useViewAs } from '@/hooks/useViewAs'
import { clearUserCache, useUser } from '@/hooks/useUser'

const ROLES = [
  { key: 'funcionario', label: 'Funcionário', href: '/dashboard' },
  { key: 'gestor', label: 'Gestor', href: '/manager/dashboard' },
  { key: 'admin', label: 'Admin', href: '/admin/dashboard' },
] as const

export default function ViewAsToggle() {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useUser()
  const { viewingAs, setViewingAs, clearViewAs } = useViewAs()
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (pathname.startsWith('/admin') && viewingAs) {
      clearViewAs()
    }
  }, [clearViewAs, pathname, viewingAs])

  if (!user?.can_visualize_as) return null

  const activeRole = viewingAs ?? user.role

  function handleRole(role: 'funcionario' | 'gestor' | 'admin', href: string) {
    if (role === 'admin') {
      clearViewAs()
    } else {
      setViewingAs(role)
    }

    clearUserCache()
    startTransition(() => {
      router.replace(href)
      router.refresh()
    })
  }

  function handleDisable() {
    clearViewAs()
    clearUserCache()
    startTransition(() => {
      router.replace('/admin/dashboard')
      router.refresh()
    })
  }

  return (
    <div className="ih-viewas" style={{ zIndex: 200 }}>
      <p className="ih-viewas-title">Visualizar como</p>

      <div className="ih-viewas-actions" style={{ flexWrap: 'wrap' }}>
        {ROLES.map(({ key, label, href }) => {
          const active = activeRole === key

          return (
            <button
              key={key}
              type="button"
              onClick={() => handleRole(key, href)}
              aria-pressed={active}
              disabled={isPending}
              className={`btn btn-sm ${active ? 'btn-accent' : 'btn-muted'}`}
              style={active ? { background: 'var(--grad-main)', color: '#fff' } : undefined}
            >
              {label}
            </button>
          )
        })}
      </div>

      {viewingAs && (
        <button className="btn btn-ghost btn-sm" type="button" disabled={isPending} onClick={handleDisable}>
          Voltar ao Admin
        </button>
      )}
    </div>
  )
}
