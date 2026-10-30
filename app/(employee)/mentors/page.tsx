'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function MentorsRedirectPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/mentorships?view=discover')
  }, [router])
  return null
}
