'use client'

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useUser } from '@/hooks/useUser'
import Icon from '@/components/shared/Icon'
import ProfileShell from '@/components/shared/ProfileShell'
import {
  approveMentorApplication,
  fetchManagerMentorships,
  rejectMentorApplication,
  removeMentorStatus,
  type ManagerMentorshipsData,
} from '@/services/managementService'

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error && 'message' in error) {
    return String((error as { message?: unknown }).message)
  }
  return 'Erro ao processar ação.'
}

function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export default function ManagerMentorshipsPage() {
  const { user, loading: userLoading } = useUser()
  const [data, setData] = useState<ManagerMentorshipsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [activeMentorSearch, setActiveMentorSearch] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setFeedback(null)

    try {
      const result = await fetchManagerMentorships()
      setData(result)
    } catch {
      setFeedback('Erro ao carregar mentorias.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredActiveMentors = useMemo(() => {
    const search = normalizeSearch(activeMentorSearch.trim())
    const activeMentors = data?.activeMentors ?? []

    if (!search) return activeMentors

    return activeMentors.filter((profile) => {
      const searchable = normalizeSearch(
        `${profile.user_name} ${profile.knowledge_area} ${profile.sector_name ?? ''}`
      )
      return searchable.includes(search)
    })
  }, [activeMentorSearch, data?.activeMentors])

  if (userLoading) return <p className="ih-loading-page">Carregando...</p>

  async function runAction(id: string, action: () => Promise<void>, success: string) {
    setSubmittingId(id)
    setFeedback(null)

    try {
      await action()
      await loadData()
      setFeedback(success)
    } catch (error) {
      setFeedback(getErrorMessage(error))
    } finally {
      setSubmittingId(null)
    }
  }

  function handleRemoveMentor(userId: string, profileId: string) {
    if (!window.confirm('Retirar este colaborador do painel de mentores ativos? O histórico de mentorias será mantido.')) {
      return
    }

    runAction(profileId, () => removeMentorStatus(userId), 'Mentor retirado do painel de mentores ativos.')
  }

  return (
    <ProfileShell
      profile="gestor"
      title="Mentorias"
      subtitle="Valide candidaturas e gerencie mentores ativos"
      user={user}
      notifCount={data?.pendingApplications.length ?? 0}
    >
      <div className="ih-dashboard-stack manager-mentorships-page">
        {feedback && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              background: feedback.includes('Erro') ? 'rgba(229,62,62,.08)' : 'rgba(0,166,81,.08)',
              color: feedback.includes('Erro') ? 'var(--danger)' : 'var(--green)',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {feedback}
          </div>
        )}

        {loading ? (
          <p className="ih-loading-page" style={{ minHeight: 280 }}>Carregando mentorias...</p>
        ) : (
          <>
            <section className="manager-mentorships-stats">
              <StatCard label="Candidaturas" value={data?.pendingApplications.length ?? 0} color="#FFC600" />
              <StatCard label="Mentores ativos" value={data?.activeMentors.length ?? 0} color="#FFC600" />
              <StatCard label="Ações pendentes" value={data?.pendingApplications.length ?? 0} color="#FFC600" />
            </section>

            <section className="manager-mentorships-panels">
              <div className="card">
                <div className="ih-section-head">
                  <div className="ih-section-title">Candidaturas Pendentes</div>
                  <span className="badge badge-amber">{data?.pendingApplications.length ?? 0}</span>
                </div>
                <div className="ih-list">
                  {(data?.pendingApplications ?? []).map((profile) => (
                    <div className="ih-list-row" key={profile.id}>
                      <div className="ih-list-dot" style={{ color: '#d97706', background: 'rgba(217,119,6,.12)' }}>
                        <Icon name="users" size={13} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ color: 'var(--ink)', fontSize: 12.5, fontWeight: 800 }}>{profile.user_name}</div>
                        <div style={{ color: 'var(--ink-3)', fontSize: 10.5 }}>
                          {profile.knowledge_area} · {profile.sector_name ?? 'Geral'} · {formatDate(profile.created_at)}
                        </div>
                      </div>
                      <button
                        className="btn btn-success btn-sm manager-mentorships-approve"
                        type="button"
                        disabled={submittingId === profile.id}
                        onClick={() =>
                          runAction(profile.id, () => approveMentorApplication(profile.id, user?.id ?? ''), 'Candidatura aprovada.')
                        }
                      >
                        Aprovar
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        type="button"
                        disabled={submittingId === profile.id}
                        onClick={() =>
                          runAction(profile.id, () => rejectMentorApplication(profile.id), 'Candidatura rejeitada.')
                        }
                      >
                        Rejeitar
                      </button>
                    </div>
                  ))}
                  {(data?.pendingApplications.length ?? 0) === 0 && <EmptyRow text="Nenhuma candidatura pendente." />}
                </div>
              </div>

              <div className="card">
                <div className="ih-section-head">
                  <div className="ih-section-title">Mentores Ativos</div>
                  <span className="badge badge-green">{filteredActiveMentors.length}</span>
                </div>

                <div className="manager-mentorships-search">
                  <Icon name="search" size={15} />
                  <input
                    className="ih-input"
                    type="search"
                    value={activeMentorSearch}
                    onChange={(event) => setActiveMentorSearch(event.target.value)}
                    placeholder="Buscar mentor ativo"
                    aria-label="Buscar mentor ativo"
                  />
                </div>

                <div className="ih-list">
                  {filteredActiveMentors.map((profile) => (
                    <div className="ih-list-row" key={profile.id}>
                      <div className="ih-list-dot" style={{ color: 'var(--green)', background: 'rgba(0,166,81,.1)' }}>
                        <Icon name="award" size={13} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ color: 'var(--ink)', fontSize: 12.5, fontWeight: 800 }}>{profile.user_name}</div>
                        <div style={{ color: 'var(--ink-3)', fontSize: 10.5 }}>
                          {profile.knowledge_area} · {profile.sector_name ?? 'Geral'}
                        </div>
                      </div>
                      <button
                        className="btn btn-danger btn-sm"
                        type="button"
                        disabled={submittingId === profile.id}
                        onClick={() => handleRemoveMentor(profile.user_id, profile.id)}
                      >
                        Retirar do painel
                      </button>
                    </div>
                  ))}
                  {(data?.activeMentors.length ?? 0) === 0 && <EmptyRow text="Nenhum mentor ativo." />}
                  {(data?.activeMentors.length ?? 0) > 0 && filteredActiveMentors.length === 0 && (
                    <EmptyRow text="Nenhum mentor encontrado para a busca." />
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </ProfileShell>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="stat-block" style={{ '--accent-color': color } as CSSProperties}>
      <div className="stat-lbl">{label}</div>
      <div className="stat-num" style={{ color }}>{value}</div>
      <div className="stat-sub">Fluxo de mentorias</div>
    </div>
  )
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div className="ih-list-row" style={{ color: 'var(--ink-3)', fontSize: 12 }}>
      {text}
    </div>
  )
}
