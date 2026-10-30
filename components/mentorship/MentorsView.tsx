'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useUser } from '@/hooks/useUser'
import Icon from '@/components/shared/Icon'
import { fetchSectors, type SectorOption } from '@/services/ideasService'
import {
  applyAsMentor,
  fetchActiveMentors,
  fetchMentorAreas,
  requestMentorship,
  type MentorProfile,
} from '@/services/mentorshipService'

function isErrorFeedback(message: string) {
  const normalized = message.toLowerCase()
  return (
    normalized.includes('erro') ||
    normalized.includes('você') ||
    normalized.includes('já possui') ||
    normalized.includes('não pode')
  )
}

function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export default function MentorsView() {
  const { user, loading } = useUser()
  const [mentors, setMentors] = useState<MentorProfile[]>([])
  const [areas, setAreas] = useState<string[]>([])
  const [sectors, setSectors] = useState<SectorOption[]>([])
  const [areaFilter, setAreaFilter] = useState('all')
  const [mentorSearch, setMentorSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [requestModalMentor, setRequestModalMentor] = useState<MentorProfile | null>(null)
  const [requestObjective, setRequestObjective] = useState('')
  const [knowledgeArea, setKnowledgeArea] = useState('')
  const [sectorId, setSectorId] = useState<string>('all')
  const [requestedMentorIds, setRequestedMentorIds] = useState<string[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    if (user?.sector_id) setSectorId(user.sector_id)
  }, [user?.sector_id])

  useEffect(() => {
    let active = true

    async function loadStaticData() {
      try {
        const [areaData, sectorData] = await Promise.all([fetchMentorAreas(), fetchSectors()])
        if (!active) return
        setAreas(areaData)
        setSectors(sectorData)
      } catch {
        if (active) setFeedback('Erro ao carregar filtros de mentoria.')
      }
    }

    loadStaticData()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true

    async function loadMentors() {
      setDataLoading(true)
      setFeedback(null)

      try {
        const data = await fetchActiveMentors(areaFilter)
        if (active) setMentors(data)
      } catch {
        if (active) setFeedback('Erro ao carregar mentores.')
      } finally {
        if (active) setDataLoading(false)
      }
    }

    loadMentors()

    return () => {
      active = false
    }
  }, [areaFilter])

  const filteredMentors = useMemo(() => {
    const search = normalizeSearch(mentorSearch.trim())
    if (!search) return mentors

    return mentors.filter((mentor) =>
      normalizeSearch(mentor.user_name).includes(search)
    )
  }, [mentorSearch, mentors])

  if (loading) return <p className="ih-loading-page">Carregando...</p>

  function openRequestModal(mentor: MentorProfile) {
    setRequestModalMentor(mentor)
    setRequestObjective(`Quero aprofundar meus conhecimentos em ${mentor.knowledge_area}.`)
  }

  function closeRequestModal() {
    if (submitting) return
    setRequestModalMentor(null)
    setRequestObjective('')
  }

  function saveLocalMentorshipProposal(requestId: string, objective: string) {
    if (!user?.id || typeof window === 'undefined') return

    const storageKey = `ih-mentorship-drafts:${user.id}`
    let parsed: Record<string, unknown> = {}

    try {
      const current = window.localStorage.getItem(storageKey)
      parsed = current ? JSON.parse(current) as Record<string, unknown> : {}
    } catch {
      parsed = {}
    }

    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        ...parsed,
        [requestId]: {
          objective: objective.trim(),
          nextMeetingDate: '',
          rating: 0,
          feedback: '',
        },
      })
    )
  }

  async function handleRequest() {
    const mentor = requestModalMentor
    if (!user?.id) return
    if (!mentor) return

    const objective = requestObjective.trim()
    if (objective.length < 10) {
      setFeedback('Descreva brevemente o objetivo da mentoria.')
      return
    }

    setFeedback(null)
    setSubmitting(true)

    try {
      const request = await requestMentorship(user.id, mentor.user_id, objective)
      saveLocalMentorshipProposal(request.id, objective)
      setRequestedMentorIds((current) => [...current, mentor.user_id])
      setRequestModalMentor(null)
      setRequestObjective('')
      setFeedback('Solicitação de mentoria enviada.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao solicitar mentoria.'
      setFeedback(message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleApply() {
    if (!user?.id) return

    setFeedback(null)
    setSubmitting(true)

    try {
      await applyAsMentor(user.id, sectorId === 'all' ? null : sectorId, knowledgeArea)
      setModalOpen(false)
      setKnowledgeArea('')
      setFeedback('Candidatura enviada. Aguardando aprovação do gestor.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao enviar candidatura.'
      setFeedback(message)
    } finally {
      setSubmitting(false)
    }
  }

  const feedbackIsError = feedback ? isErrorFeedback(feedback) : false

  return (
    <>
      <div className="ih-dashboard-stack">
        <Link
          className="mentors-back-link"
          href="/mentorships?view=mentee"
          prefetch={false}
          aria-label="Voltar para minhas mentorias como mentorado"
        >
          <Icon name="chevron-left" size={15} />
          <span>Voltar</span>
        </Link>

        <section
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 540px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 260px', minWidth: 240 }}>
              <Icon
                name="search"
                size={15}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--ink-3)',
                  pointerEvents: 'none',
                }}
              />
              <input
                className="ih-input"
                type="search"
                value={mentorSearch}
                onChange={(event) => setMentorSearch(event.target.value)}
                placeholder="Buscar mentor por nome"
                aria-label="Buscar mentor por nome"
                style={{ width: '100%', minHeight: 36, paddingLeft: 36 }}
              />
            </div>
            <select
              className="ih-input"
              value={areaFilter}
              onChange={(event) => setAreaFilter(event.target.value)}
              style={{ minWidth: 220, minHeight: 36 }}
              aria-label="Filtrar por área de conhecimento"
            >
              <option value="all">Todas as áreas</option>
              {areas.map((area) => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>
            <span className="badge badge-gray">
              {filteredMentors.length} mentor{filteredMentors.length !== 1 ? 'es' : ''}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-accent btn-sm" type="button" onClick={() => setModalOpen(true)}>
              <Icon name="plus" size={15} />
              Ser mentor
            </button>
          </div>
        </section>

        {feedback && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              background: feedbackIsError ? 'rgba(229,62,62,.08)' : 'var(--mentorship-positive-soft)',
              color: feedbackIsError ? 'var(--danger)' : 'var(--mentorship-positive)',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {feedback}
          </div>
        )}

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
          {dataLoading ? (
            <div className="card card-p" style={{ color: 'var(--ink-3)' }}>
              Carregando mentores...
            </div>
          ) : (
            filteredMentors.map((mentor, index) => {
              const isSelf = mentor.user_id === user?.id
              const requested = requestedMentorIds.includes(mentor.user_id)

              return (
                <article
                  className="card"
                  key={mentor.id}
                  style={{ animation: `fadeUp ${index * 0.06}s ease both` }}
                >
                  <div className="card-p">
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 16 }}>
                      <div
                        className="ih-avatar"
                        style={{ width: 42, height: 42, background: 'var(--accent)', color: '#fff' }}
                      >
                        {mentor.user_name
                          .split(' ')
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((part) => part[0]?.toUpperCase())
                          .join('')}
                      </div>
                      <span className="badge mentorship-badge-positive">Ativo</span>
                    </div>

                    <h2 style={{ margin: '0 0 6px', color: 'var(--ink)', fontSize: 15, fontWeight: 800 }}>
                      {mentor.user_name}
                    </h2>
                    <p style={{ minHeight: 58, margin: '0 0 14px', color: 'var(--ink-3)', fontSize: 12, lineHeight: 1.5 }}>
                      {mentor.knowledge_area}
                    </p>

                    <div className="ih-kv-grid" style={{ marginBottom: 16 }}>
                      <div className="ih-kv">
                        <div className="ih-kv-label">Setor</div>
                        <div className="ih-kv-value">{mentor.sector_name ?? 'Geral'}</div>
                      </div>
                      <div className="ih-kv">
                        <div className="ih-kv-label">Status</div>
                        <div className="ih-kv-value mentorship-status-value">
                          Disponível
                        </div>
                      </div>
                    </div>

                    <button
                      className={`btn btn-sm ${isSelf || requested ? 'btn-muted' : 'btn-accent'}`}
                      type="button"
                      disabled={isSelf || requested || submitting}
                      onClick={() => openRequestModal(mentor)}
                    >
                      {isSelf ? 'Seu perfil' : requested ? 'Solicitada' : 'Solicitar mentoria'}
                    </button>
                  </div>
                </article>
              )
            })
          )}

          {!dataLoading && filteredMentors.length === 0 && (
            <div className="card card-p" style={{ color: 'var(--ink-3)', fontSize: 13 }}>
              Nenhum mentor encontrado para a busca ou filtro selecionado.
            </div>
          )}
        </section>
      </div>

      {modalOpen && typeof document !== 'undefined' && createPortal(
        <div className="ih-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="ih-modal" onClick={(event) => event.stopPropagation()}>
            <div className="card-p">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
                <div>
                  <h2 style={{ margin: '0 0 4px', color: 'var(--ink)', fontSize: 18, fontWeight: 800 }}>
                    Candidatura como mentor
                  </h2>
                  <p style={{ margin: 0, color: 'var(--ink-3)', fontSize: 12 }}>
                    Seu perfil ficará pendente de aprovação do gestor.
                  </p>
                </div>
                <button className="ih-icon-btn" type="button" onClick={() => setModalOpen(false)} aria-label="Fechar">
                  <Icon name="x" size={16} />
                </button>
              </div>

              <div style={{ display: 'grid', gap: 12 }}>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ color: 'var(--ink)', fontSize: 12, fontWeight: 800 }}>Área de conhecimento</span>
                  <input
                    className="ih-input"
                    value={knowledgeArea}
                    onChange={(event) => setKnowledgeArea(event.target.value)}
                    placeholder="Ex.: Lean, dados, qualidade, regulatório"
                  />
                </label>

                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ color: 'var(--ink)', fontSize: 12, fontWeight: 800 }}>Setor</span>
                  <select
                    className="ih-input"
                    value={sectorId}
                    onChange={(event) => setSectorId(event.target.value)}
                  >
                    <option value="all">Geral</option>
                    {sectors.map((sector) => (
                      <option key={sector.id} value={sector.id}>
                        {sector.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button className="btn btn-muted btn-md" type="button" style={{ flex: 1 }} onClick={() => setModalOpen(false)}>
                    Cancelar
                  </button>
                  <button
                    className="btn btn-accent btn-md"
                    type="button"
                    style={{ flex: 1 }}
                    disabled={knowledgeArea.trim().length < 3 || submitting}
                    onClick={handleApply}
                  >
                    Enviar candidatura
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {requestModalMentor && typeof document !== 'undefined' && createPortal(
        <div className="ih-modal-backdrop" onClick={closeRequestModal}>
          <div className="ih-modal" onClick={(event) => event.stopPropagation()}>
            <div className="card-p">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
                <div>
                  <h2 style={{ margin: '0 0 4px', color: 'var(--ink)', fontSize: 18, fontWeight: 800 }}>
                    Solicitar mentoria
                  </h2>
                  <p style={{ margin: 0, color: 'var(--ink-3)', fontSize: 12 }}>
                    Preencha a proposta que será exibida na aba Minhas mentorias.
                  </p>
                </div>
                <button className="ih-icon-btn" type="button" onClick={closeRequestModal} aria-label="Fechar">
                  <Icon name="x" size={16} />
                </button>
              </div>

              <div style={{ display: 'grid', gap: 14 }}>
                <div className="ih-kv-grid">
                  <div className="ih-kv">
                    <div className="ih-kv-label">Mentor</div>
                    <div className="ih-kv-value">{requestModalMentor.user_name}</div>
                  </div>
                  <div className="ih-kv">
                    <div className="ih-kv-label">Tema</div>
                    <div className="ih-kv-value">{requestModalMentor.knowledge_area}</div>
                  </div>
                  <div className="ih-kv">
                    <div className="ih-kv-label">Setor</div>
                    <div className="ih-kv-value">{requestModalMentor.sector_name ?? 'Geral'}</div>
                  </div>
                  <div className="ih-kv">
                    <div className="ih-kv-label">Próximo passo</div>
                    <div className="ih-kv-value">Aguardando o mentor</div>
                  </div>
                </div>

                <label style={{ display: 'grid', gap: 7 }}>
                  <span style={{ color: 'var(--ink)', fontSize: 12, fontWeight: 850 }}>Proposta de objetivo</span>
                  <textarea
                    className="ih-textarea"
                    value={requestObjective}
                    onChange={(event) => setRequestObjective(event.target.value)}
                    placeholder="Explique o que você quer desenvolver ou resolver com esta mentoria."
                    style={{ minHeight: 112 }}
                  />
                </label>

                <div
                  style={{
                    padding: 13,
                    borderRadius: 8,
                    background: 'color-mix(in srgb, var(--accent) 8%, transparent)',
                    color: 'var(--ink-2)',
                    fontSize: 12.5,
                    fontWeight: 700,
                    lineHeight: 1.55,
                  }}
                >
                  Depois do envio, a solicitação fica pendente até o mentor aceitar a parceria.
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button className="btn btn-muted btn-md" type="button" style={{ flex: 1 }} onClick={closeRequestModal}>
                    Cancelar
                  </button>
                  <button
                    className="btn btn-accent btn-md"
                    type="button"
                    style={{ flex: 1 }}
                    disabled={requestObjective.trim().length < 10 || submitting}
                    onClick={handleRequest}
                  >
                    Enviar solicitação
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
