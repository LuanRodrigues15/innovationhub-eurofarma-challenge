'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function IdeaDetailRedirect({ id }: { id: string }) {
  const router = useRouter()
  useEffect(() => {
    router.replace(`/hub?idea=${encodeURIComponent(id)}`)
  }, [id, router])
  return null
}
