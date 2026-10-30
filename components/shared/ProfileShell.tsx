'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut, type UserProfile } from '@/services/auth.service'
import {
  fetchMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type Notification,
} from '@/services/notificationService'
import Icon, { type IconName } from '@/components/shared/Icon'
import { clearUserCache } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'

type Profile = 'funcionario' | 'gestor' | 'admin'
type NavItem = { label: string; icon: IconName; href: string }
type NotificationToast = {
  id: string
  notificationId?: string
  title: string
  body: string
  href?: string | null
}

const PROFILE_META: Record<Profile, { label: string; role: string; color: string; nav: NavItem[] }> = {
  funcionario: {
    label: 'Funcionário',
    role: 'Colaborador',
    color: '#0057a8',
    nav: [
      { label: 'Início', icon: 'home', href: '/dashboard' },
      { label: 'Innovation IA', icon: 'sparkles', href: '/ia-innovation' },
      { label: 'Hub de Ideias', icon: 'lightbulb', href: '/hub' },
      { label: 'Ranking', icon: 'award', href: '/leaderboard' },
      { label: 'Marketplace', icon: 'gift', href: '/marketplace' },
      { label: 'Academy', icon: 'cpu', href: '/academy' },
      { label: 'Mentorias', icon: 'users', href: '/mentorships' },
      { label: 'Meu Perfil', icon: 'user', href: '/profile' },
    ],
  },
  gestor: {
    label: 'Gestor',
    role: 'Gestor',
    color: '#1d4ed8',
    nav: [
      { label: 'Visão Geral', icon: 'home', href: '/manager/dashboard' },
      { label: 'Triagem de Ideias', icon: 'layers', href: '/manager/dashboard/hub' },
      { label: 'Hub de Ideias', icon: 'lightbulb', href: '/hub' },
      { label: 'Métricas', icon: 'bar-chart', href: '/manager/metrics' },
      { label: 'Mentorias', icon: 'users', href: '/manager/mentorships' },
      { label: 'Meu Perfil', icon: 'user', href: '/manager/profile' },
    ],
  },
  admin: {
    label: 'Administrador',
    role: 'Admin',
    color: '#374151',
    nav: [
      { label: 'Painel Geral', icon: 'home', href: '/admin/dashboard' },
      { label: 'Usuários', icon: 'users', href: '/admin/users' },
      { label: 'Conteúdo', icon: 'layers', href: '/admin/content' },
      { label: 'Moderação', icon: 'shield', href: '/admin/moderation' },
      { label: 'Configurações', icon: 'settings', href: '/admin/settings' },
    ],
  },
}

type ProfileShellProps = {
  profile: Profile
  title: string
  subtitle: string
  user: UserProfile | null
  points?: number | null
  notifCount?: number
  sidebarExtra?: ReactNode
  pageBodyClass?: string
  noPadding?: boolean
  mainRef?: RefObject<HTMLElement>
  children: ReactNode
}

function initials(name?: string | null) {
  if (!name) return 'IH'
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
}

function displayName(name?: string | null): string {
  if (!name) return 'Innovation HUB'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return parts[0] ?? 'Innovation HUB'
  const firstLast = `${parts[0]} ${parts[parts.length - 1]}`
  if (firstLast.length <= 16) return firstLast
  return parts[0]
}

function displayRole(user: UserProfile | null, fallback: string) {
  if (!user?.level) return fallback
  return `Nível ${user.level}`
}

function formatNotificationDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export default function ProfileShell({
  profile,
  title,
  subtitle,
  user,
  points,
  notifCount = 0,
  sidebarExtra,
  pageBodyClass,
  noPadding = false,
  mainRef,
  children,
}: ProfileShellProps) {
  const router = useRouter()
  const pathname = usePathname()
  const meta = PROFILE_META[profile]
  const userInitials = initials(user?.name)
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== 'undefined' && localStorage.getItem('ih-sidebar-collapsed') === 'true'
  )
  const [darkMode, setDarkMode] = useState(
    () => typeof window !== 'undefined' && localStorage.getItem('ih-dark-mode') === 'true'
  )
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notifLoading, setNotifLoading] = useState(false)
  const [notificationToasts, setNotificationToasts] = useState<NotificationToast[]>([])
  const notifPanelRef = useRef<HTMLDivElement>(null)
  const [navProgress, setNavProgress] = useState<'idle' | 'start' | 'loading'>('idle')
  const navProgressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const shownToastIds = useRef<Set<string>>(new Set())
  const navRaf1 = useRef<number | null>(null)
  const navRaf2 = useRef<number | null>(null)
  const navShouldComplete = useRef(false)
  const navBarRef = useRef<HTMLDivElement>(null)
  const unreadCount = notifications.filter((notification) => !notification.read_at).length
  const effectiveNotifCount = user?.id ? unreadCount : notifCount

  const dismissToast = useCallback((toastId: string) => {
    if (toastTimers.current[toastId]) {
      clearTimeout(toastTimers.current[toastId])
      delete toastTimers.current[toastId]
    }
    setNotificationToasts((current) => current.filter((toast) => toast.id !== toastId))
  }, [])

  const rememberShownToasts = useCallback((notificationIds: string[]) => {
    if (!user?.id || typeof window === 'undefined') return
    notificationIds.forEach((id) => shownToastIds.current.add(id))
    window.sessionStorage.setItem(
      `ih-shown-notifications:${user.id}`,
      JSON.stringify(Array.from(shownToastIds.current).slice(-80))
    )
  }, [user?.id])

  const enqueueNotificationToasts = useCallback((items: Notification[]) => {
    const unread = items.filter((notification) => !notification.read_at)
    const unseen = unread.filter((notification) => !shownToastIds.current.has(notification.id))
    if (unseen.length === 0) return

    const nextToasts: NotificationToast[] = unseen.length > 2
      ? [{
          id: `summary-${Date.now()}`,
          title: `Você tem ${unseen.length} novas notificações`,
          body: 'Clique no sino para revisar suas atualizações.',
          href: null,
        }]
      : unseen.map((notification) => ({
          id: `notification-${notification.id}`,
          notificationId: notification.id,
          title: notification.title,
          body: notification.body,
          href: notification.href,
        }))

    rememberShownToasts(unseen.map((notification) => notification.id))
    setNotificationToasts((current) => [...nextToasts, ...current].slice(0, 3))

    nextToasts.forEach((toast) => {
      if (toastTimers.current[toast.id]) clearTimeout(toastTimers.current[toast.id])
      toastTimers.current[toast.id] = setTimeout(() => dismissToast(toast.id), 4500)
    })
  }, [dismissToast, rememberShownToasts])

  const loadNotifications = useCallback(async () => {
    if (!user?.id) {
      setNotifications([])
      return
    }
    setNotifLoading(true)
    try {
      const data = await fetchMyNotifications(user.id)
      setNotifications(data)
      enqueueNotificationToasts(data)
    } catch {
      setNotifications([])
    } finally {
      setNotifLoading(false)
    }
  }, [enqueueNotificationToasts, user?.id])

  useEffect(() => {
    if (!user?.id || typeof window === 'undefined') {
      shownToastIds.current = new Set()
      setNotificationToasts([])
      return
    }

    try {
      const saved = window.sessionStorage.getItem(`ih-shown-notifications:${user.id}`)
      shownToastIds.current = new Set(saved ? JSON.parse(saved) as string[] : [])
    } catch {
      shownToastIds.current = new Set()
    }
  }, [user?.id])

  // Carga inicial + recarrega ao focar na janela
  useEffect(() => {
    loadNotifications()
    window.addEventListener('focus', loadNotifications)
    return () => window.removeEventListener('focus', loadNotifications)
  }, [loadNotifications])

  // Supabase Realtime — recebe INSERT em tempo real, sem polling
  useEffect(() => {
    if (!user?.id) return
    const supabase = createClient()
    const channel = supabase
      .channel(`notif-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const notif = payload.new as Notification
          setNotifications((prev) => {
            if (prev.some((n) => n.id === notif.id)) return prev
            return [notif, ...prev]
          })
          enqueueNotificationToasts([notif])
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user?.id, enqueueNotificationToasts])

  // Fecha painel ao clicar fora
  useEffect(() => {
    if (!notificationsOpen) return
    function handleOutside(e: MouseEvent) {
      if (notifPanelRef.current && !notifPanelRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [notificationsOpen])

  useEffect(() => {
    return () => {
      Object.values(toastTimers.current).forEach(clearTimeout)
      toastTimers.current = {}
    }
  }, [])

  function triggerDone() {
    if (navProgressTimer.current) clearTimeout(navProgressTimer.current)
    const el = navBarRef.current
    if (!el) { setNavProgress('idle'); return }
    const currentTransform = window.getComputedStyle(el).transform
    el.style.transition = 'none'
    el.style.transform = currentTransform
    void el.offsetWidth
    el.style.transition = 'transform 0.45s cubic-bezier(0.1, 0.9, 0.2, 1), opacity 0.25s ease 0.45s'
    el.style.transform = 'scaleX(1)'
    el.style.opacity = '0'
    navProgressTimer.current = setTimeout(() => setNavProgress('idle'), 730)
  }

  function toggleCollapsed() {
    setCollapsed(c => {
      const next = !c
      localStorage.setItem('ih-sidebar-collapsed', String(next))
      return next
    })
  }

  function toggleDarkMode() {
    setDarkMode(d => {
      const next = !d
      localStorage.setItem('ih-dark-mode', String(next))
      document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
      window.dispatchEvent(new CustomEvent('ih:theme', { detail: next }))
      return next
    })
  }

  async function handleNotificationClick(notification: Notification) {
    if (!user?.id) return
    if (!notification.read_at) {
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item
        )
      )
      await markNotificationRead(notification.id, user.id).catch(() => null)
    }

    setNotificationsOpen(false)
    if (notification.href) router.push(notification.href)
  }

  async function handleToastClick(toast: NotificationToast) {
    dismissToast(toast.id)

    if (toast.notificationId && user?.id) {
      setNotifications((current) =>
        current.map((item) =>
          item.id === toast.notificationId ? { ...item, read_at: new Date().toISOString() } : item
        )
      )
      await markNotificationRead(toast.notificationId, user.id).catch(() => null)
    }

    if (toast.href) router.push(toast.href)
  }

  async function handleMarkAllNotificationsRead() {
    if (!user?.id) return
    setNotifications((current) =>
      current.map((notification) => notification.read_at ? notification : { ...notification, read_at: new Date().toISOString() })
    )
    await markAllNotificationsRead(user.id).catch(() => null)
  }

  function startNav(href: string) {
    if (href === pathname) return
    if (navProgressTimer.current) clearTimeout(navProgressTimer.current)
    if (navRaf1.current) cancelAnimationFrame(navRaf1.current)
    if (navRaf2.current) cancelAnimationFrame(navRaf2.current)
    navShouldComplete.current = false
    if (navBarRef.current) navBarRef.current.removeAttribute('style')
    setNavProgress('start')
    navRaf1.current = requestAnimationFrame(() => {
      navRaf2.current = requestAnimationFrame(() => {
        setNavProgress('loading')
        if (navShouldComplete.current) {
          requestAnimationFrame(() => triggerDone())
        }
      })
    })
  }

  useEffect(() => {
    if (navProgress === 'loading') {
      triggerDone()
    } else if (navProgress === 'start') {
      navShouldComplete.current = true
    }
    return () => {
      if (navProgressTimer.current) clearTimeout(navProgressTimer.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
    window.dispatchEvent(new CustomEvent('ih:theme', { detail: darkMode }))
  }, [darkMode])

  useEffect(() => {
    document.documentElement.dataset.profile = profile
    return () => { delete document.documentElement.dataset.profile }
  }, [profile])

  async function handleLogout() {
    clearUserCache()
    await signOut()
    router.push('/login')
  }

  return (
    <div className="ih-app-root" data-theme={darkMode ? 'dark' : 'light'}>
      {navProgress !== 'idle' && (
        <div ref={navBarRef} className={`ih-nav-progress${navProgress === 'loading' ? ' loading' : ''}`} />
      )}

      {/* SIDEBAR — always navy in both light and dark modes */}
      <aside className={`ih-sidebar${collapsed ? ' collapsed' : ''}`}>
        <div className="ih-sidebar-logo">
          <div className="ih-sidebar-glyph">
            {/* dark mode glyph — Eurofarma logo branca */}
            <svg className="ih-glyph-dark" width="44" height="44" viewBox="0 0 67.43 67.49" xmlns="http://www.w3.org/2000/svg">
              <path fill="#FFFFFF" d="M53.81,44.88c-3.72,0.22-8.13,0.8-12.89,1.74l-0.35-1.53c4.94-0.99,9.54-1.62,13.41-1.89c0.43-5,0.2-10.09-0.6-15.04c-4.72,0.17-10.29,0.84-16.25,2.03l-0.37-1.59c5.99-1.19,11.58-1.88,16.34-2.06c-1.02-5.44-2.7-10.37-4.82-14.5c-4.34,0.27-9.42,0.96-14.86,2.06l-0.37-1.58c5.29-1.06,10.2-1.74,14.39-2.02c-2.93-5.14-6.58-8.8-10.48-10.34c-3.54-0.34-7.18-0.15-10.84,0.69C15.52,3.3,7.28,10.51,3.07,19.69c4.24-3.85,13.65-7.99,25.02-10.62l0.03-0.01l2.31,10.02c-15.15,3.5-27.31,9.05-30.41,13.51c-0.08,2.49,0.11,5.02,0.6,7.57C3.1,36.24,15.7,29.18,31.89,25.45l0.01,0l2.19,9.48c-16.35,3.77-29.07,10.13-29.96,15c1.14,2.1,2.49,4.05,4.02,5.83c0.11-4.19,12.04-10.23,27.52-13.81l0.04-0.01l2.26,9.78l-0.02,0c-12.8,2.95-22.63,7.72-22.06,10.66c7.32,4.56,16.37,6.33,25.43,4.24c0.8-0.18,1.57-0.43,2.34-0.67C48.92,62.66,52.66,54.78,53.81,44.88"/>
              <path fill="#FFFFFF" d="M49.29,10.4c4.26-0.18,7.61,0.12,9.66,0.91c-5.03-5.65-11.87-9.5-19.37-10.83C43.18,2.17,46.55,5.64,49.29,10.4"/>
              <path fill="#FFFFFF" d="M67.29,30.61c-1.7-1.7-6.06-2.55-12.05-2.49c0.78,4.94,0.99,10.01,0.53,14.99c5.24-0.21,8.85,0.35,9.8,1.7C67.12,40.35,67.75,35.53,67.29,30.61"/>
              <path fill="#FFFFFF" d="M50.13,11.96c2.14,4.13,3.82,9.09,4.82,14.54c3.82-0.05,8.66,0.15,12.09,2.14c-0.13-0.84-0.25-1.67-0.44-2.51c-1.15-4.97-3.37-9.4-6.31-13.17C58.22,12.13,54.68,11.79,50.13,11.96"/>
              <path fill="#FFFFFF" d="M55.58,44.8c-1.17,9.38-4.68,16.9-9.62,20.34c8.75-3.4,15.45-10.2,18.9-18.5C64.02,45.27,60.59,44.65,55.58,44.8"/>
            </svg>
            {/* light mode glyph — Eurofarma logo azul */}
            <svg className="ih-glyph-light" width="44" height="44" viewBox="0 0 67.43 67.49" xmlns="http://www.w3.org/2000/svg">
              <path fill="#00358E" d="M53.81,44.88c-3.72,0.22-8.13,0.8-12.89,1.74l-0.35-1.53c4.94-0.99,9.54-1.62,13.41-1.89c0.43-5,0.2-10.09-0.6-15.04c-4.72,0.17-10.29,0.84-16.25,2.03l-0.37-1.59c5.99-1.19,11.58-1.88,16.34-2.06c-1.02-5.44-2.7-10.37-4.82-14.5c-4.34,0.27-9.42,0.96-14.86,2.06l-0.37-1.58c5.29-1.06,10.2-1.74,14.39-2.02c-2.93-5.14-6.58-8.8-10.48-10.34c-3.54-0.34-7.18-0.15-10.84,0.69C15.52,3.3,7.28,10.51,3.07,19.69c4.24-3.85,13.65-7.99,25.02-10.62l0.03-0.01l2.31,10.02c-15.15,3.5-27.31,9.05-30.41,13.51c-0.08,2.49,0.11,5.02,0.6,7.57C3.1,36.24,15.7,29.18,31.89,25.45l0.01,0l2.19,9.48c-16.35,3.77-29.07,10.13-29.96,15c1.14,2.1,2.49,4.05,4.02,5.83c0.11-4.19,12.04-10.23,27.52-13.81l0.04-0.01l2.26,9.78l-0.02,0c-12.8,2.95-22.63,7.72-22.06,10.66c7.32,4.56,16.37,6.33,25.43,4.24c0.8-0.18,1.57-0.43,2.34-0.67C48.92,62.66,52.66,54.78,53.81,44.88"/>
              <path fill="#00358E" d="M49.29,10.4c4.26-0.18,7.61,0.12,9.66,0.91c-5.03-5.65-11.87-9.5-19.37-10.83C43.18,2.17,46.55,5.64,49.29,10.4"/>
              <path fill="#00358E" d="M67.29,30.61c-1.7-1.7-6.06-2.55-12.05-2.49c0.78,4.94,0.99,10.01,0.53,14.99c5.24-0.21,8.85,0.35,9.8,1.7C67.12,40.35,67.75,35.53,67.29,30.61"/>
              <path fill="#00358E" d="M50.13,11.96c2.14,4.13,3.82,9.09,4.82,14.54c3.82-0.05,8.66,0.15,12.09,2.14c-0.13-0.84-0.25-1.67-0.44-2.51c-1.15-4.97-3.37-9.4-6.31-13.17C58.22,12.13,54.68,11.79,50.13,11.96"/>
              <path fill="#00358E" d="M55.58,44.8c-1.17,9.38-4.68,16.9-9.62,20.34c8.75-3.4,15.45-10.2,18.9-18.5C64.02,45.27,60.59,44.65,55.58,44.8"/>
            </svg>
          </div>
          <div className="ih-sidebar-brand">
            <div className="ih-sidebar-title">Innovation HUB</div>
            <div className="ih-sidebar-sub">EUROFARMA</div>
          </div>
          <button
            className="ih-sidebar-toggle"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Abrir barra lateral' : 'Fechar barra lateral'}
            data-label={collapsed ? 'Abrir barra lateral' : 'Fechar barra lateral'}
          >
            <span className="ih-toggle-page-icon">
              <svg className="ih-glyph-dark" width="32" height="32" viewBox="0 0 67.43 67.49" xmlns="http://www.w3.org/2000/svg">
                <path fill="#FFFFFF" d="M53.81,44.88c-3.72,0.22-8.13,0.8-12.89,1.74l-0.35-1.53c4.94-0.99,9.54-1.62,13.41-1.89c0.43-5,0.2-10.09-0.6-15.04c-4.72,0.17-10.29,0.84-16.25,2.03l-0.37-1.59c5.99-1.19,11.58-1.88,16.34-2.06c-1.02-5.44-2.7-10.37-4.82-14.5c-4.34,0.27-9.42,0.96-14.86,2.06l-0.37-1.58c5.29-1.06,10.2-1.74,14.39-2.02c-2.93-5.14-6.58-8.8-10.48-10.34c-3.54-0.34-7.18-0.15-10.84,0.69C15.52,3.3,7.28,10.51,3.07,19.69c4.24-3.85,13.65-7.99,25.02-10.62l0.03-0.01l2.31,10.02c-15.15,3.5-27.31,9.05-30.41,13.51c-0.08,2.49,0.11,5.02,0.6,7.57C3.1,36.24,15.7,29.18,31.89,25.45l0.01,0l2.19,9.48c-16.35,3.77-29.07,10.13-29.96,15c1.14,2.1,2.49,4.05,4.02,5.83c0.11-4.19,12.04-10.23,27.52-13.81l0.04-0.01l2.26,9.78l-0.02,0c-12.8,2.95-22.63,7.72-22.06,10.66c7.32,4.56,16.37,6.33,25.43,4.24c0.8-0.18,1.57-0.43,2.34-0.67C48.92,62.66,52.66,54.78,53.81,44.88"/>
                <path fill="#FFFFFF" d="M49.29,10.4c4.26-0.18,7.61,0.12,9.66,0.91c-5.03-5.65-11.87-9.5-19.37-10.83C43.18,2.17,46.55,5.64,49.29,10.4"/>
                <path fill="#FFFFFF" d="M67.29,30.61c-1.7-1.7-6.06-2.55-12.05-2.49c0.78,4.94,0.99,10.01,0.53,14.99c5.24-0.21,8.85,0.35,9.8,1.7C67.12,40.35,67.75,35.53,67.29,30.61"/>
                <path fill="#FFFFFF" d="M50.13,11.96c2.14,4.13,3.82,9.09,4.82,14.54c3.82-0.05,8.66,0.15,12.09,2.14c-0.13-0.84-0.25-1.67-0.44-2.51c-1.15-4.97-3.37-9.4-6.31-13.17C58.22,12.13,54.68,11.79,50.13,11.96"/>
                <path fill="#FFFFFF" d="M55.58,44.8c-1.17,9.38-4.68,16.9-9.62,20.34c8.75-3.4,15.45-10.2,18.9-18.5C64.02,45.27,60.59,44.65,55.58,44.8"/>
              </svg>
              <svg className="ih-glyph-light" width="32" height="32" viewBox="0 0 67.43 67.49" xmlns="http://www.w3.org/2000/svg">
                <path fill="#00358E" d="M53.81,44.88c-3.72,0.22-8.13,0.8-12.89,1.74l-0.35-1.53c4.94-0.99,9.54-1.62,13.41-1.89c0.43-5,0.2-10.09-0.6-15.04c-4.72,0.17-10.29,0.84-16.25,2.03l-0.37-1.59c5.99-1.19,11.58-1.88,16.34-2.06c-1.02-5.44-2.7-10.37-4.82-14.5c-4.34,0.27-9.42,0.96-14.86,2.06l-0.37-1.58c5.29-1.06,10.2-1.74,14.39-2.02c-2.93-5.14-6.58-8.8-10.48-10.34c-3.54-0.34-7.18-0.15-10.84,0.69C15.52,3.3,7.28,10.51,3.07,19.69c4.24-3.85,13.65-7.99,25.02-10.62l0.03-0.01l2.31,10.02c-15.15,3.5-27.31,9.05-30.41,13.51c-0.08,2.49,0.11,5.02,0.6,7.57C3.1,36.24,15.7,29.18,31.89,25.45l0.01,0l2.19,9.48c-16.35,3.77-29.07,10.13-29.96,15c1.14,2.1,2.49,4.05,4.02,5.83c0.11-4.19,12.04-10.23,27.52-13.81l0.04-0.01l2.26,9.78l-0.02,0c-12.8,2.95-22.63,7.72-22.06,10.66c7.32,4.56,16.37,6.33,25.43,4.24c0.8-0.18,1.57-0.43,2.34-0.67C48.92,62.66,52.66,54.78,53.81,44.88"/>
                <path fill="#00358E" d="M49.29,10.4c4.26-0.18,7.61,0.12,9.66,0.91c-5.03-5.65-11.87-9.5-19.37-10.83C43.18,2.17,46.55,5.64,49.29,10.4"/>
                <path fill="#00358E" d="M67.29,30.61c-1.7-1.7-6.06-2.55-12.05-2.49c0.78,4.94,0.99,10.01,0.53,14.99c5.24-0.21,8.85,0.35,9.8,1.7C67.12,40.35,67.75,35.53,67.29,30.61"/>
                <path fill="#00358E" d="M50.13,11.96c2.14,4.13,3.82,9.09,4.82,14.54c3.82-0.05,8.66,0.15,12.09,2.14c-0.13-0.84-0.25-1.67-0.44-2.51c-1.15-4.97-3.37-9.4-6.31-13.17C58.22,12.13,54.68,11.79,50.13,11.96"/>
                <path fill="#00358E" d="M55.58,44.8c-1.17,9.38-4.68,16.9-9.62,20.34c8.75-3.4,15.45-10.2,18.9-18.5C64.02,45.27,60.59,44.65,55.58,44.8"/>
              </svg>
            </span>
            <span className="ih-toggle-panel-icon"><Icon name="panel-left" size={16} /></span>
          </button>
        </div>

        <nav className="ih-sidebar-nav" aria-label="Navegação principal">
          <div className="ih-nav-section">MENU</div>
          {meta.nav.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== '/dashboard' &&
                item.href !== '/manager/dashboard' &&
                pathname.startsWith(`${item.href}/`))

            return (
              <Link
                key={item.href}
                className={`ih-nav-item ${active ? 'active' : ''}`}
                href={item.href}
                prefetch={false}
                data-label={item.label}
                onClick={() => startNav(item.href)}
              >
                <span className="ih-nav-icon"><Icon name={item.icon} size={17} /></span>
                <span className="ih-nav-label">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {!collapsed && sidebarExtra && (
          <div style={{ padding: '0 10px 10px', flexShrink: 0 }}>
            {sidebarExtra}
          </div>
        )}

        <div className="ih-sidebar-footer">
          <div className="ih-user-row">
            <Link href="/profile" className="ih-user-info" data-label="Meu Perfil">
              <div className="ih-sidebar-avatar">{userInitials}</div>
              <div className="ih-user-text">
                <div className="ih-user-name truncate">{displayName(user?.name)}</div>
                <div className="ih-user-role truncate">{displayRole(user, meta.role)}</div>
              </div>
            </Link>
            <button onClick={handleLogout} type="button" className="ih-logout-btn" aria-label="Sair">
              <Icon name="log-out" size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN AREA — light or dark depending on toggle */}
      <div className="ih-main-area" data-theme={darkMode ? 'dark' : 'light'}>
        <header className="ih-topbar">
          <div>
            <div className="ih-topbar-title">{title}</div>
            <div className="ih-topbar-sub">{subtitle}</div>
          </div>
          <div className="ih-topbar-spacer" />

          {profile === 'funcionario' && (
            <div className="ih-points-chip">
              <Icon name="award" size={14} />
              <span>{(points ?? 0).toLocaleString('pt-BR')} pts</span>
              <span className="ih-nv-badge">NV {user?.level ?? 1}</span>
            </div>
          )}

          <button
            className="ih-theme-toggle"
            type="button"
            onClick={toggleDarkMode}
            aria-label={darkMode ? 'Modo claro' : 'Modo escuro'}
            title={darkMode ? 'Modo claro' : 'Modo escuro'}
          >
            <Icon name={darkMode ? 'sun' : 'moon'} size={14} />
          </button>

          <div ref={notifPanelRef} style={{ position: 'relative' }}>
            <button
              className="ih-icon-btn"
              type="button"
              aria-label={effectiveNotifCount > 0 ? `${effectiveNotifCount} notificações` : 'Notificações'}
              aria-expanded={notificationsOpen}
              onClick={() => {
                setNotificationsOpen((current) => !current)
                loadNotifications()
              }}
              style={{ position: 'relative' }}
            >
              <Icon name="bell" size={14} />
              {effectiveNotifCount > 0 && (
                <span className="ih-notif-dot">
                  {effectiveNotifCount > 9 ? '9+' : effectiveNotifCount}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 10px)',
                  right: 0,
                  width: 330,
                  maxWidth: 'calc(100vw - 28px)',
                  border: '1px solid var(--line)',
                  borderRadius: 8,
                  background: 'var(--surface)',
                  boxShadow: '0 18px 50px rgba(15, 23, 42, 0.16)',
                  overflow: 'hidden',
                  zIndex: 9999,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    padding: '12px 14px',
                    borderBottom: '1px solid var(--line)',
                  }}
                >
                  <div style={{ color: 'var(--ink)', fontSize: 13, fontWeight: 900 }}>Notificações</div>
                  {unreadCount > 0 && (
                    <button
                      className="btn btn-muted btn-sm"
                      type="button"
                      onClick={handleMarkAllNotificationsRead}
                    >
                      Marcar lidas
                    </button>
                  )}
                </div>

                <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                  {notifLoading && notifications.length === 0 ? (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--ink-3)', fontSize: 12.5 }}>
                      Carregando...
                    </div>
                  ) : notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() => handleNotificationClick(notification)}
                        style={{
                          width: '100%',
                          display: 'grid',
                          gap: 5,
                          padding: '12px 14px',
                          border: 'none',
                          borderBottom: '1px solid var(--line)',
                          background: notification.read_at ? 'transparent' : 'color-mix(in srgb, var(--accent) 7%, transparent)',
                          textAlign: 'left',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                          <span style={{ color: 'var(--ink)', fontSize: 12.5, fontWeight: 850 }}>
                            {notification.title}
                          </span>
                          <span style={{ color: 'var(--ink-3)', fontSize: 10.5, flexShrink: 0 }}>
                            {formatNotificationDate(notification.created_at)}
                          </span>
                        </div>
                        <span style={{ color: 'var(--ink-3)', fontSize: 11.5, lineHeight: 1.45 }}>
                          {notification.body}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div style={{ padding: 16, color: 'var(--ink-3)', fontSize: 12.5 }}>
                      Nenhuma notificação por enquanto.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        </header>

        {notificationToasts.length > 0 && (
          <div className="ih-notif-toast-stack" aria-live="polite">
            {notificationToasts.map((toast) => (
              <button
                key={toast.id}
                className="ih-notif-toast"
                type="button"
                onClick={() => handleToastClick(toast)}
              >
                <span className="ih-notif-toast-icon">
                  <Icon name="bell" size={14} />
                </span>
                <span className="ih-notif-toast-copy">
                  <strong>{toast.title}</strong>
                  <span>{toast.body}</span>
                </span>
              </button>
            ))}
          </div>
        )}

        <main
          ref={mainRef}
          className={`ih-page-body${pageBodyClass ? ` ${pageBodyClass}` : ''}${noPadding ? ' no-padding' : ''}`}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
