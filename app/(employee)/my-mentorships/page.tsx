'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function MyMentorshipsRedirectPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/mentorships?view=mentee')
  }, [router])
  return null
}
