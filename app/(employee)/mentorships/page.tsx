'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import MentorshipsPageClient, { type MentorshipView } from '@/components/mentorship/MentorshipsPageClient'

function getInitialView(value: string | null): MentorshipView {
  if (value === 'discover') return 'discover'
  if (value === 'mentor') return 'mentor'
  return 'mentee'
}

// Em site estático não há searchParams no servidor: a aba vem da URL, lida no navegador.
function MentorshipsContent() {
  const searchParams = useSearchParams()
  return <MentorshipsPageClient initialView={getInitialView(searchParams.get('view'))} />
}

export default function MentorshipsPage() {
  return (
    <Suspense fallback={null}>
      <MentorshipsContent />
    </Suspense>
  )
}
