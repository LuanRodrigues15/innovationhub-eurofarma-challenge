'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Icon, { type IconName } from '@/components/shared/Icon'
import ProfileShell from '@/components/shared/ProfileShell'
import MentorsView from '@/components/mentorship/MentorsView'
import MyMentorshipsView from '@/components/mentorship/MyMentorshipsView'
import { useUser } from '@/hooks/useUser'

export type MentorshipView = 'mentee' | 'mentor' | 'discover'

const VIEW_OPTIONS: Array<{ id: Exclude<MentorshipView, 'discover'>; label: string; icon: IconName }> = [
  { id: 'mentee', label: 'Sou mentorado', icon: 'user' },
  { id: 'mentor', label: 'Sou mentor', icon: 'award' },
]

export default function MentorshipsPageClient({ initialView }: { initialView: MentorshipView }) {
  const { user, loading } = useUser()
  const router = useRouter()
  const [activeView, setActiveView] = useState<MentorshipView>(initialView)

  useEffect(() => {
    setActiveView(initialView)
  }, [initialView])

  if (loading) return <p className="ih-loading-page">Carregando...</p>

  function changeView(view: MentorshipView) {
    setActiveView(view)
    router.replace(`/mentorships?view=${view}`)
  }

  return (
    <ProfileShell
      profile="funcionario"
      title="Mentorias"
      subtitle="Encontre mentores, acompanhe solicitações e gerencie seu perfil"
      user={user}
      points={user?.points ?? 0}
      pageBodyClass="light-page"
    >
      <div className="ih-dashboard-stack mentorships-page">
        <section className="mentorships-segmented" aria-label="Alternar visão de mentorias">
          {VIEW_OPTIONS.map((option) => (
            <button
              key={option.id}
              className={`mentorships-segment${activeView === option.id || (activeView === 'discover' && option.id === 'mentee') ? ' is-active' : ''}`}
              type="button"
              aria-pressed={activeView === option.id || (activeView === 'discover' && option.id === 'mentee')}
              onClick={() => changeView(option.id)}
            >
              <Icon name={option.icon} size={15} />
              <span>{option.label}</span>
            </button>
          ))}
        </section>

        {activeView === 'discover' ? <MentorsView /> : <MyMentorshipsView role={activeView} />}
      </div>
    </ProfileShell>
  )
}
