'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function TotemLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.profile = 'totem'
    const previousHtmlHeight = document.documentElement.style.height
    const previousBodyHeight = document.body.style.height
    const previousBodyOverflow = document.body.style.overflow

    document.documentElement.style.height = '100dvh'
    document.body.style.height = '100dvh'
    document.body.style.overflow = 'hidden'

    const totemUserId = sessionStorage.getItem('totem_user_id')
    if (!totemUserId) {
      router.push('/totem-login')
    } else {
      setAuthorized(true)
    }

    return () => {
      delete document.documentElement.dataset.profile
      document.documentElement.style.height = previousHtmlHeight
      document.body.style.height = previousBodyHeight
      document.body.style.overflow = previousBodyOverflow
    }
  }, [router])

  if (!authorized) return null

  return (
    <main
      style={{
        height: '100dvh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--sidebar-bg)',
      }}
    >
      {children}
    </main>
  )
}
