'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useUser } from '@/hooks/useUser'
import Icon, { type IconName } from '@/components/shared/Icon'
import { fetchSectors, type SectorOption } from '@/services/ideasService'
import {
  applyAsMentor,
  approveMentorshipRequest,
  approveNextMeetingDate,
  cancelMentorApplication,
  cancelMentorshipRequest,
  completeMentorshipRequest,
  deactivateOwnMentorProfile,
  declineNextMeetingDate,
  fetchMyMentorships,
  proposeNextMeetingDate,
  rejectMentorshipRequest,
  submitMentorshipEvaluation,
  updateMentorProfile,
  type MentorshipRequest,
  type MyMentorshipsData,
} from '@/services/mentorshipService'

export type MentorshipRoleView = 'mentee' | 'mentor'
type MentorshipStatusView = 'pending' | 'active' | 'history'

type MentorshipDraft = {
  objective: string
  nextMeetingDate: string
  rating: number
  feedback: string
  evaluationTouched: boolean
}

type DraftsById = Record<string, MentorshipDraft>
type MentorCandidateProfile = NonNullable<MyMentorshipsData['candidateProfile']>
type DetailPanelMode = 'mentorship' | 'mentorProfile'

const EMPTY_DRAFT: MentorshipDraft = {
  objective: '',
  nextMeetingDate: '',
  rating: 0,
  feedback: '',
  evaluationTouched: false,
}

const ROLE_COPY: Record<MentorshipRoleView, {
  title: string
  subtitle: string
  listTitle: string
  empty: string
}> = {
  mentee: {
    title: 'Minhas mentorias como mentorado',
    subtitle: '',
    listTitle: 'Jornada como mentorado',
    empty: 'Nenhuma mentoria encontrada para esta visão como mentorado.',
  },
  mentor: {
    title: 'Minhas mentorias como mentor',
    subtitle: '',
    listTitle: 'Jornada como mentor',
    empty: 'Nenhuma mentoria encontrada para esta visão como mentor.',
  },
}

const STATUS_VIEW_COPY: Record<MentorshipStatusView, {
  label: string
  description: string
  icon: IconName
  color: string
}> = {
  active: {
    label: 'Em andamento',
    description: 'Mentorias ativas para acompanhar',
    icon: 'users',
    color: '#22C55E',
  },
  pending: {
    label: 'Pendências',
    description: 'Solicitações e ações aguardando definição',
    icon: 'clock',
    color: '#F97316',
  },
  history: {
    label: 'Histórico',
    description: 'Ciclos finalizados ou interrompidos',
    icon: 'check-circle',
    color: '#94A3B8',
  },
}

function translateCandidateStatus(status: string) {
  if (status === 'active') return 'Ativo'
  if (status === 'pending') return 'Pendente'
  if (status === 'inactive') return 'Inativo'
  return status
}

function formatDate(value: string) {
  const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const date = dateOnlyMatch
    ? new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]))
    : new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getTodayInputDate() {
  const date = new Date()
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 10)
}

function getDraft(drafts: DraftsById, requestId: string): MentorshipDraft {
  return {
    ...EMPTY_DRAFT,
    ...(drafts[requestId] ?? {}),
  }
}

function getCounterpart(request: MentorshipRequest, currentUserId: string) {
  return request.mentor_id === currentUserId ? request.mentee_name : request.mentor_name
}

function getRoleLabel(request: MentorshipRequest, currentUserId: string) {
  return request.mentor_id === currentUserId ? 'Mentor' : 'Mentorado'
}

function getDefaultObjective(request: MentorshipRequest, currentUserId: string) {
  if (request.mentor_knowledge_area) return `Evoluir em ${request.mentor_knowledge_area}`
  return `Acompanhamento com ${getCounterpart(request, currentUserId)}`
}

function getEffectiveObjective(
  request: MentorshipRequest,
  currentUserId: string,
  draft: MentorshipDraft
) {
  return request.objective?.trim() || draft.objective.trim() || getDefaultObjective(request, currentUserId)
}

function getObjectiveLabel(status: string) {
  return status === 'active' || status === 'completed'
    ? 'Objetivo combinado'
    : 'Proposta de objetivo'
}

function getEvaluationAuthorLabel(request: MentorshipRequest, evaluatorId: string, currentUserId: string) {
  if (evaluatorId === currentUserId) return 'Você'
  if (evaluatorId === request.mentor_id) return request.mentor_name
  if (evaluatorId === request.mentee_id) return request.mentee_name
  return 'Participante'
}

function getEvaluationRoleLabel(role: string) {
  if (role === 'mentor') return 'mentor'
  if (role === 'mentee') return 'mentorado'
  return 'participante'
}

function getRequestStatusMeta(status: string): {
  label: string
  badgeClass: string
  icon: IconName
  color: string
  background: string
} {
  if (status === 'active') {
    return {
      label: 'Em andamento',
      badgeClass: 'mentorship-badge-positive',
      icon: 'check-circle',
      color: '#22C55E',
      background: 'rgba(34,197,94,.16)',
    }
  }

  if (status === 'completed') {
    return {
      label: 'Finalizada',
      badgeClass: 'badge-blue',
      icon: 'check-circle',
      color: '#94A3B8',
      background: 'rgba(148,163,184,.18)',
    }
  }

  if (status === 'cancelled') {
    return {
      label: 'Interrompida',
      badgeClass: 'badge-gray',
      icon: 'x',
      color: '#EF4444',
      background: 'rgba(239,68,68,.12)',
    }
  }

  return {
    label: 'Aguardando mentor',
    badgeClass: 'badge-amber',
    icon: 'clock',
    color: '#F97316',
    background: 'rgba(249,115,22,.16)',
  }
}

function getNextAction(request: MentorshipRequest, currentUserId: string) {
  const isMentor = request.mentor_id === currentUserId

  if (request.status === 'pending') {
    return {
      title: isMentor ? 'Solicitação recebida' : 'Aguardando o mentor',
      desc: isMentor
        ? 'Analise a proposta do mentorado e aceite a parceria se fizer sentido para sua disponibilidade e escopo.'
        : 'O mentor vai avaliar sua proposta para confirmar se a parceria faz sentido.',
    }
  }

  if (request.status === 'active') {
    return {
      title: 'Acompanhar mentoria',
      desc: 'Combine os próximos passos com seu par e marque a mentoria como finalizada quando fizer sentido.',
    }
  }

  if (request.status === 'completed') {
    return {
      title: 'Avaliar mentoria',
      desc: 'Registre o feedback final para fechar a jornada.',
    }
  }

  return {
    title: 'Fluxo encerrado',
    desc: 'A mentoria foi interrompida e permanece no histórico.',
  }
}

function getMeetingStatusLabel(status: string) {
  if (status === 'approved') return 'Data aprovada'
  if (status === 'proposed') return 'Aguardando aprovação'
  if (status === 'declined') return 'Data recusada'
  return 'Sem data definida'
}

function getActionErrorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error
    ? error.message
    : typeof error === 'object' && error && 'message' in error
    ? String((error as { message?: unknown }).message)
    : ''
  const normalized = message.toLowerCase()

  if (
    normalized.includes('mentor_rating') ||
    normalized.includes('mentee_rating') ||
    normalized.includes('mentor_feedback') ||
    normalized.includes('mentee_feedback') ||
    normalized.includes('evaluated_at') ||
    normalized.includes('mentorship_evaluations')
  ) {
    return 'A atualização de avaliações de mentoria ainda não foi aplicada no banco. Execute a migration supabase/migrations/20260517143000_mentorship_evaluations.sql no Supabase.'
  }

  if (
    normalized.includes('next_meeting') ||
    normalized.includes('objective') ||
    normalized.includes('schema cache') ||
    normalized.includes('column')
  ) {
    return 'A atualização de mentoria colaborativa ainda não foi aplicada no banco. Execute a migration supabase/migrations/20260516172000_mentorship_collaboration.sql no Supabase.'
  }

  return message || fallback
}

function getTimelineSteps(status: string) {
  return [
    { label: 'Solicitada', state: 'done' },
    {
      label: status === 'cancelled' ? 'Interrompida' : status === 'pending' ? 'Aceite do mentor' : 'Confirmada',
      state: status === 'pending' ? 'current' : status === 'cancelled' ? 'danger' : 'done',
    },
    {
      label: 'Em andamento',
      state: status === 'active' ? 'current' : status === 'completed' ? 'done' : 'idle',
    },
    {
      label: 'Finalizada',
      state: status === 'completed' ? 'done' : 'idle',
    },
  ] as const
}

function Timeline({ status }: { status: string }) {
  const steps = getTimelineSteps(status)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
      {steps.map((step) => {
        const active = step.state === 'done' || step.state === 'current'
        const color = step.state === 'danger' ? 'var(--danger)' : active ? 'var(--accent)' : 'var(--line)'

        return (
          <div key={step.label} style={{ minWidth: 0 }}>
            <div
              style={{
                height: 4,
                borderRadius: 999,
                background: color,
                opacity: step.state === 'idle' ? 0.45 : 1,
                marginBottom: 7,
              }}
            />
            <div
              style={{
                color: step.state === 'idle' ? 'var(--ink-3)' : step.state === 'danger' ? 'var(--danger)' : 'var(--ink)',
                fontSize: 10.5,
                fontWeight: step.state === 'current' ? 900 : 750,
                lineHeight: 1.25,
              }}
            >
              {step.label}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function MentorshipStatusDropdown({
  activeView,
  counts,
  onChange,
}: {
  activeView: MentorshipStatusView
  counts: Record<MentorshipStatusView, number>
  onChange: (view: MentorshipStatusView) => void
}) {
  const [open, setOpen] = useState(false)
  const activeCopy = STATUS_VIEW_COPY[activeView]
  const options = Object.keys(STATUS_VIEW_COPY) as MentorshipStatusView[]

  function selectView(view: MentorshipStatusView) {
    onChange(view)
    setOpen(false)
  }

  return (
    <div
      className="my-mentorships-status-dropdown"
      onBlur={(event) => {
        const nextFocus = event.relatedTarget as Node | null
        if (!nextFocus || !event.currentTarget.contains(nextFocus)) setOpen(false)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') setOpen(false)
      }}
    >
      <button
        className={`my-mentorships-dropdown-trigger${open ? ' is-open' : ''}`}
        type="button"
        style={{ '--view-color': activeCopy.color } as CSSProperties}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="my-mentorships-view-icon">
          <Icon name={activeCopy.icon} size={15} />
        </span>
        <span className="my-mentorships-view-copy">
          <small>Visão de jornada</small>
          <strong>{activeCopy.label}</strong>
        </span>
        <span className="my-mentorships-view-count">{counts[activeView]}</span>
        <span className="my-mentorships-dropdown-chevron" aria-hidden="true">
          <Icon name="chevron-down" size={14} />
        </span>
      </button>

      {open && (
        <div className="my-mentorships-dropdown-menu" role="listbox" aria-label="Selecionar visão da jornada">
          {options.map((view) => {
            const option = STATUS_VIEW_COPY[view]
            const active = view === activeView

            return (
              <button
                key={view}
                className={`my-mentorships-dropdown-option${active ? ' is-active' : ''}`}
                type="button"
                role="option"
                aria-selected={active}
                style={{ '--view-color': option.color } as CSSProperties}
                onClick={() => selectView(view)}
              >
                <span className="my-mentorships-view-icon">
                  <Icon name={option.icon} size={15} />
                </span>
                <span className="my-mentorships-view-copy">
                  <strong>{option.label}</strong>
                  <small>{option.description}</small>
                </span>
                <span className="my-mentorships-view-count">{counts[view]}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function RequestRow({
  request,
  currentUserId,
  selected,
  onSelect,
}: {
  request: MentorshipRequest
  currentUserId: string
  selected: boolean
  onSelect: () => void
}) {
  const counterpart = getCounterpart(request, currentUserId)
  const statusMeta = getRequestStatusMeta(request.status)
  const nextAction = getNextAction(request, currentUserId)

  return (
    <button
      className={`ih-list-row my-mentorships-row${selected ? ' is-selected' : ''}`}
      type="button"
      onClick={onSelect}
    >
      <span
        className="my-mentorships-status-dot"
        style={{
          '--status-color': statusMeta.color,
          '--status-bg': statusMeta.background,
        } as CSSProperties}
        aria-label={statusMeta.label}
        data-label={statusMeta.label}
        title={statusMeta.label}
      />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ color: 'var(--ink)', fontSize: 12.5, fontWeight: 850, lineHeight: 1.45 }}>
          {counterpart}
        </div>
        <div className="my-mentorships-row-meta">
          <span>{getRoleLabel(request, currentUserId)}</span>
          <span aria-hidden="true">-</span>
          <span>{formatDate(request.created_at)}</span>
        </div>
        <div className="my-mentorships-row-tags">
          <span>{request.mentor_knowledge_area ?? 'Tema a definir'}</span>
          <span>{nextAction.title}</span>
        </div>
      </div>
    </button>
  )
}

function DetailPanel({
  request,
  currentUserId,
  draft,
  submitting,
  onDraftChange,
  onApproveRequest,
  onRejectRequest,
  onCancelRequest,
  onCompleteRequest,
  onProposeMeeting,
  onApproveMeeting,
  onDeclineMeeting,
  onSubmitEvaluation,
}: {
  request: MentorshipRequest | null
  currentUserId: string
  draft: MentorshipDraft
  submitting: boolean
  onDraftChange: (requestId: string, patch: Partial<MentorshipDraft>) => void
  onApproveRequest: (requestId: string) => void
  onRejectRequest: (requestId: string) => void
  onCancelRequest: (requestId: string) => void
  onCompleteRequest: (requestId: string) => void
  onProposeMeeting: (requestId: string, meetingDate: string) => void
  onApproveMeeting: (requestId: string) => void
  onDeclineMeeting: (requestId: string) => void
  onSubmitEvaluation: (requestId: string, rating: number, feedback: string) => void
}) {
  const [meetingEditorOpen, setMeetingEditorOpen] = useState(false)

  useEffect(() => {
    setMeetingEditorOpen(false)
  }, [request?.id])

  if (!request) {
    return (
      <section className="card">
        <div className="card-p" style={{ color: 'var(--ink-3)', fontSize: 13 }}>
          Selecione uma mentoria para acompanhar detalhes.
        </div>
      </section>
    )
  }

  const isMentor = request.mentor_id === currentUserId
  const counterpart = getCounterpart(request, currentUserId)
  const statusMeta = getRequestStatusMeta(request.status)
  const nextAction = getNextAction(request, currentUserId)
  const objective = getEffectiveObjective(request, currentUserId, draft)
  const meetingDraftDate = draft.nextMeetingDate || request.next_meeting_date || ''
  const hasMeetingProposal = request.next_meeting_status === 'proposed' && Boolean(request.next_meeting_date)
  const meetingWasProposedByCurrentUser = request.next_meeting_proposed_by === currentUserId
  const canRespondToMeeting = hasMeetingProposal && !meetingWasProposedByCurrentUser
  const evaluations = [...request.evaluations].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
  const evaluationRating = draft.rating
  const evaluationFeedback = draft.feedback

  return (
    <section className="card my-mentorships-detail">
      <div className="card-p" style={{ display: 'grid', gap: 16 }}>
        <div className="my-mentorships-detail-head">
          <div style={{ minWidth: 0 }}>
            <div style={{ color: 'var(--ink)', fontSize: 16, fontWeight: 900, lineHeight: 1.25 }}>
              {counterpart}
            </div>
            <div style={{ marginTop: 4, color: 'var(--ink-3)', fontSize: 12 }}>
              Você atua como {isMentor ? 'mentor' : 'mentorado'} - criada em {formatDate(request.created_at)}
            </div>
          </div>
          <span
            className="badge my-mentorships-detail-status"
            style={{
              '--status-color': statusMeta.color,
              '--status-bg': statusMeta.background,
            } as CSSProperties}
          >
            {statusMeta.label}
          </span>
        </div>

        <Timeline status={request.status} />

        <div className="ih-kv-grid my-mentorships-detail-grid">
          <div className="ih-kv">
            <div className="ih-kv-label">Tema</div>
            <div className="ih-kv-value">{request.mentor_knowledge_area ?? 'A definir'}</div>
          </div>
          <div className="ih-kv">
            <div className="ih-kv-label">Setor</div>
            <div className="ih-kv-value">{request.mentor_sector_name ?? 'Geral'}</div>
          </div>
        </div>

        <div className="my-mentorships-next-step">
          <div>
            <span>Próximo passo</span>
            <strong>{nextAction.title}</strong>
          </div>
          <p>{nextAction.desc}</p>
        </div>

        <div style={{ display: 'grid', gap: 7 }}>
          <span style={{ color: 'var(--ink)', fontSize: 12, fontWeight: 850 }}>{getObjectiveLabel(request.status)}</span>
          <div
            style={{
              minHeight: 42,
              padding: '11px 13px',
              border: '1px solid var(--line)',
              borderRadius: 8,
              background: 'var(--surface-2)',
              color: 'var(--ink)',
              fontSize: 13,
              fontWeight: 700,
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              overflowWrap: 'anywhere',
              wordBreak: 'break-word',
            }}
          >
            {objective}
          </div>
        </div>

        {request.status === 'active' && (
          <div style={{ display: 'grid', gap: 10 }}>
            <div className="ih-kv" style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <div>
                  <div className="ih-kv-label">Próxima reunião</div>
                  <div className="ih-kv-value">
                    {request.next_meeting_date
                      ? `${formatDate(request.next_meeting_date)} - ${getMeetingStatusLabel(request.next_meeting_status)}`
                      : 'Nenhuma data proposta'}
                  </div>
                </div>
                <button
                  className="ih-icon-btn"
                  type="button"
                  title={request.next_meeting_date ? 'Sugerir outra data' : 'Propor data'}
                  aria-label={request.next_meeting_date ? 'Sugerir outra data' : 'Propor data'}
                  aria-expanded={meetingEditorOpen}
                  onClick={() => setMeetingEditorOpen((current) => !current)}
                >
                  <Icon name="more-horizontal" size={16} />
                </button>
              </div>

              {meetingEditorOpen && (
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    paddingTop: 8,
                    borderTop: '1px solid var(--line)',
                  }}
                >
                  <input
                    className="ih-input"
                    type="date"
                    min={getTodayInputDate()}
                    value={meetingDraftDate}
                    onChange={(event) => onDraftChange(request.id, { nextMeetingDate: event.target.value })}
                    style={{ minHeight: 38, maxWidth: 220 }}
                    aria-label={request.next_meeting_date ? 'Sugerir outra data' : 'Propor data da próxima reunião'}
                  />
                  <button
                    className="btn btn-accent btn-sm"
                    type="button"
                    disabled={submitting || !meetingDraftDate}
                    onClick={() => {
                      onProposeMeeting(request.id, meetingDraftDate)
                      setMeetingEditorOpen(false)
                    }}
                  >
                    Propor data
                  </button>
                </div>
              )}
            </div>

            {canRespondToMeeting && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  className="btn btn-accent btn-sm"
                  type="button"
                  disabled={submitting}
                  onClick={() => onApproveMeeting(request.id)}
                >
                  Aprovar data
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  type="button"
                  disabled={submitting}
                  onClick={() => onDeclineMeeting(request.id)}
                >
                  Recusar data
                </button>
              </div>
            )}

            {hasMeetingProposal && (
              <div
                style={{
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid var(--line)',
                  background: 'var(--surface-2)',
                  color: 'var(--ink-2)',
                  fontSize: 12,
                  fontWeight: 700,
                  lineHeight: 1.45,
                }}
              >
                {meetingWasProposedByCurrentUser
                  ? 'Você propôs esta data. Aguarde a aprovação do outro participante.'
                  : `${getCounterpart(request, currentUserId)} propôs esta data. Aprove ou recuse para alinhar a agenda.`}
              </div>
            )}
            {request.next_meeting_status === 'declined' && (
              <div style={{ color: 'var(--danger)', fontSize: 11.5, fontWeight: 700 }}>
                A última proposta foi recusada. Escolha uma nova data para continuar o alinhamento.
              </div>
            )}
          </div>
        )}

        {request.status === 'pending' && isMentor && (
          <div
            style={{
              padding: 13,
              borderRadius: 8,
              border: '1px solid var(--line)',
              background: 'var(--surface-2)',
              color: 'var(--ink-2)',
              fontSize: 12.5,
              fontWeight: 700,
              lineHeight: 1.5,
            }}
          >
            Esta solicitação depende da sua aprovação para entrar em andamento.
          </div>
        )}

        {request.status === 'completed' && (
          <div style={{ display: 'grid', gap: 12 }}>
            {evaluations.length > 0 && (
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ color: 'var(--ink)', fontSize: 12, fontWeight: 850 }}>
                  Avaliações registradas
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {evaluations.map((evaluation) => (
                    <div
                      key={evaluation.id}
                      style={{
                        padding: 12,
                        border: '1px solid var(--line)',
                        borderRadius: 8,
                        background: 'var(--surface-2)',
                        display: 'grid',
                        gap: 6,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 10,
                          flexWrap: 'wrap',
                        }}
                      >
                        <strong style={{ color: 'var(--ink)', fontSize: 12 }}>
                          {getEvaluationAuthorLabel(request, evaluation.evaluator_id, currentUserId)} como{' '}
                          {getEvaluationRoleLabel(evaluation.role)}
                        </strong>
                        <span style={{ color: 'var(--ink-3)', fontSize: 11, fontWeight: 700 }}>
                          {formatDate(evaluation.created_at)} - Nota {evaluation.rating}/5
                        </span>
                      </div>
                      {evaluation.feedback && (
                        <p
                          style={{
                            margin: 0,
                            color: 'var(--ink-2)',
                            fontSize: 12,
                            fontWeight: 650,
                            lineHeight: 1.45,
                            whiteSpace: 'pre-wrap',
                            overflowWrap: 'anywhere',
                          }}
                        >
                          {evaluation.feedback}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ color: 'var(--ink)', fontSize: 12, fontWeight: 850 }}>Nova avaliação</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[1, 2, 3, 4, 5].map((score) => (
                <button
                  key={score}
                  className={`btn btn-sm ${evaluationRating === score ? 'btn-accent' : 'btn-muted'}`}
                  type="button"
                  onClick={() => onDraftChange(request.id, {
                    rating: score,
                    feedback: evaluationFeedback,
                    evaluationTouched: true,
                  })}
                  aria-label={`Avaliar com ${score}`}
                >
                  {score}
                </button>
              ))}
            </div>
            <textarea
              className="ih-textarea"
              value={evaluationFeedback}
              onChange={(event) => onDraftChange(request.id, {
                rating: evaluationRating,
                feedback: event.target.value,
                evaluationTouched: true,
              })}
              placeholder="Como essa mentoria ajudou? O que poderia melhorar?"
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button
                className="btn btn-accent btn-sm"
                type="button"
                disabled={submitting || evaluationRating < 1}
                onClick={() => onSubmitEvaluation(request.id, evaluationRating, evaluationFeedback)}
              >
                Registrar avaliação
              </button>
              <span style={{ color: 'var(--ink-3)', fontSize: 11.5, fontWeight: 700 }}>
                Registros anteriores ficam travados no histórico.
              </span>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {request.status === 'pending' && isMentor && (
            <>
              <button
                className="btn btn-accent btn-sm"
                type="button"
                disabled={submitting}
                onClick={() => onApproveRequest(request.id)}
              >
                Aprovar solicitação
              </button>
              <button
                className="btn btn-danger btn-sm"
                type="button"
                disabled={submitting}
                onClick={() => onRejectRequest(request.id)}
              >
                Recusar solicitação
              </button>
            </>
          )}

          {request.status === 'active' && (
            <button
              className="btn btn-accent btn-sm"
              type="button"
              disabled={submitting}
              onClick={() => onCompleteRequest(request.id)}
            >
              <Icon name="check" size={14} />
              Marcar como finalizada
            </button>
          )}

          {request.status === 'pending' && !isMentor && (
            <button
              className="btn btn-danger btn-sm"
              type="button"
              disabled={submitting}
              onClick={() => onCancelRequest(request.id)}
            >
              Cancelar solicitação
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

function MentorProfilePanel({
  candidate,
  submitting,
  onApply,
  onEdit,
  onDeactivate,
  onCancelApplication,
  onShowMentorships,
}: {
  candidate: MentorCandidateProfile | null
  submitting: boolean
  onApply: () => void
  onEdit: () => void
  onDeactivate: () => void
  onCancelApplication: () => void
  onShowMentorships: () => void
}) {
  const activeCandidate = candidate && candidate.status !== 'inactive' ? candidate : null
  const statusLabel = activeCandidate ? translateCandidateStatus(activeCandidate.status) : 'Inativo'
  const badgeClass = activeCandidate?.status === 'active'
    ? 'mentorship-badge-positive'
    : activeCandidate?.status === 'pending'
    ? 'badge-amber'
    : 'badge-gray'
  const title = activeCandidate?.status === 'pending' ? 'Candidatura como mentor' : 'Perfil de mentor'
  const subtitle = activeCandidate?.status === 'pending'
    ? 'Acompanhe o status da sua candidatura para atuar como mentor.'
    : 'Gerencie sua participação no painel de mentores.'

  return (
    <section className="card my-mentorships-profile-panel">
      <div className="card-p" style={{ display: 'grid', gap: 16 }}>
        <div className="my-mentorships-detail-head">
          <div style={{ minWidth: 0 }}>
            <div style={{ color: 'var(--ink)', fontSize: 16, fontWeight: 900, lineHeight: 1.25 }}>
              {title}
            </div>
            <div style={{ marginTop: 4, color: 'var(--ink-3)', fontSize: 12 }}>
              {subtitle}
            </div>
          </div>
          <span className={`badge ${badgeClass}`}>{statusLabel}</span>
        </div>

        {activeCandidate ? (
          <>
            <div className="ih-kv-grid my-mentorships-detail-grid">
              <div className="ih-kv">
                <div className="ih-kv-label">Escopo</div>
                <div className="ih-kv-value">{activeCandidate.knowledge_area}</div>
              </div>
              <div className="ih-kv">
                <div className="ih-kv-label">Setor</div>
                <div className="ih-kv-value">{activeCandidate.sector_name ?? 'Geral'}</div>
              </div>
              <div className="ih-kv">
                <div className="ih-kv-label">Criada em</div>
                <div className="ih-kv-value">{formatDate(activeCandidate.created_at)}</div>
              </div>
            </div>

            <div className="my-mentorships-profile-toggle-card">
              {activeCandidate.status === 'active' ? (
                <button
                  className="my-mentorships-toggle is-on"
                  type="button"
                  role="switch"
                  aria-checked="true"
                  disabled={submitting}
                  onClick={onDeactivate}
                >
                  <span className="my-mentorships-toggle-track" aria-hidden="true">
                    <span />
                  </span>
                  <span>Visível no painel</span>
                </button>
              ) : (
                <button
                  className="my-mentorships-toggle is-pending"
                  type="button"
                  role="switch"
                  aria-checked="true"
                  disabled={submitting}
                  onClick={onCancelApplication}
                >
                  <span className="my-mentorships-toggle-track" aria-hidden="true">
                    <span />
                  </span>
                  <span>Candidatura em análise</span>
                </button>
              )}
              <p>
                {activeCandidate.status === 'active'
                  ? 'Ao desativar, você deixa de receber novas solicitações pelo painel. As mentorias já registradas continuam no histórico.'
                  : 'Seu gestor ainda precisa aprovar sua participação. Se não quiser seguir, você pode cancelar a candidatura.'}
              </p>
            </div>

            <div className="my-mentorships-profile-actions">
              <button className="btn btn-muted btn-sm" type="button" disabled={submitting} onClick={onEdit}>
                Editar perfil
              </button>
              {activeCandidate.status === 'pending' && (
                <button
                  className="btn btn-danger btn-sm"
                  type="button"
                  disabled={submitting}
                  onClick={onCancelApplication}
                >
                  Cancelar candidatura
                </button>
              )}
              <button className="btn btn-muted btn-sm" type="button" onClick={onShowMentorships}>
                Ver mentorias
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="my-mentorships-profile-toggle-card">
              <button
                className="my-mentorships-toggle is-off"
                type="button"
                role="switch"
                aria-checked="false"
                disabled={submitting}
                onClick={onApply}
              >
                <span className="my-mentorships-toggle-track" aria-hidden="true">
                  <span />
                </span>
                <span>Ser mentor</span>
              </button>
              <p>
                Cadastre seu escopo para aparecer no painel e receber solicitações alinhadas à sua experiência.
              </p>
            </div>

            <div className="my-mentorships-profile-actions">
              <button className="btn btn-accent btn-sm" type="button" disabled={submitting} onClick={onApply}>
                Ser mentor
              </button>
              <button className="btn btn-muted btn-sm" type="button" onClick={onShowMentorships}>
                Ver mentorias
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  )
}

export default function MyMentorshipsView({ role }: { role: MentorshipRoleView }) {
  const { user, loading } = useUser()
  const [data, setData] = useState<MyMentorshipsData | null>(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [requestSubmittingId, setRequestSubmittingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [activeStatusView, setActiveStatusView] = useState<MentorshipStatusView>('active')
  const [detailMode, setDetailMode] = useState<DetailPanelMode>('mentorship')
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<DraftsById>({})
  const [sectors, setSectors] = useState<SectorOption[]>([])
  const [mentorApplicationOpen, setMentorApplicationOpen] = useState(false)
  const [mentorApplicationArea, setMentorApplicationArea] = useState('')
  const [mentorApplicationSectorId, setMentorApplicationSectorId] = useState<string>('all')
  const [editMentorOpen, setEditMentorOpen] = useState(false)
  const [editMentorArea, setEditMentorArea] = useState('')
  const [editMentorSectorId, setEditMentorSectorId] = useState<string>('all')
  const mentorDefaultViewKey = useRef<string | null>(null)

  const storageKey = user?.id ? `ih-mentorship-drafts:${user.id}` : null

  useEffect(() => {
    if (user?.sector_id) setMentorApplicationSectorId(user.sector_id)
  }, [user?.sector_id])

  const loadData = useCallback(async () => {
    if (!user?.id) return

    setDataLoading(true)
    setFeedback(null)

    try {
      const result = await fetchMyMentorships(user.id)
      setData(result)
    } catch (error) {
      setFeedback(getActionErrorMessage(error, 'Erro ao carregar mentorias.'))
    } finally {
      setDataLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') return

    try {
      const saved = window.localStorage.getItem(storageKey)
      const parsed = saved ? (JSON.parse(saved) as DraftsById) : {}
      const normalized = Object.entries(parsed).reduce<DraftsById>((acc, [requestId, draft]) => {
        acc[requestId] = {
          ...EMPTY_DRAFT,
          ...draft,
          nextMeetingDate: '',
        }
        return acc
      }, {})
      setDrafts(normalized)
    } catch {
      setDrafts({})
    }
  }, [storageKey])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    let active = true

    async function loadSectors() {
      try {
        const data = await fetchSectors()
        if (active) setSectors(data)
      } catch {
        if (active) setFeedback('Erro ao carregar setores.')
      }
    }

    loadSectors()

    return () => {
      active = false
    }
  }, [])

  const allRequests = useMemo(() => {
    if (!data) return []

    return [...data.active, ...data.pending, ...data.history].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }, [data])

  const roleRequests = useMemo(() => {
    if (!user?.id) return []

    return allRequests.filter((request) =>
      role === 'mentor'
        ? request.mentor_id === user.id
        : request.mentee_id === user.id
    )
  }, [allRequests, role, user?.id])

  const requestsByStatus = useMemo<Record<MentorshipStatusView, MentorshipRequest[]>>(() => ({
    pending: roleRequests.filter((request) => request.status === 'pending'),
    active: roleRequests.filter((request) => request.status === 'active'),
    history: roleRequests.filter((request) => request.status === 'completed' || request.status === 'cancelled'),
  }), [roleRequests])

  const filteredRequests = useMemo(() => {
    return requestsByStatus[activeStatusView]
  }, [activeStatusView, requestsByStatus])

  const selectedRequest =
    filteredRequests.find((request) => request.id === selectedRequestId) ?? filteredRequests[0] ?? null

  useEffect(() => {
    if (filteredRequests.length === 0) {
      if (selectedRequestId) setSelectedRequestId(null)
      return
    }

    const selectedIsVisible = filteredRequests.some((request) => request.id === selectedRequestId)
    if (!selectedIsVisible) {
      setSelectedRequestId(filteredRequests[0].id)
    }
  }, [filteredRequests, selectedRequestId])

  function persistDrafts(next: DraftsById) {
    if (storageKey && typeof window !== 'undefined') {
      const persisted = Object.entries(next).reduce<DraftsById>((acc, [requestId, draft]) => {
        acc[requestId] = {
          ...draft,
          nextMeetingDate: '',
        }
        return acc
      }, {})
      window.localStorage.setItem(storageKey, JSON.stringify(persisted))
    }
  }

  function updateDraft(requestId: string, patch: Partial<MentorshipDraft>) {
    setDrafts((current) => {
      const next = {
        ...current,
        [requestId]: {
          ...EMPTY_DRAFT,
          ...(current[requestId] ?? {}),
          ...patch,
        },
      }

      persistDrafts(next)
      return next
    })
  }

  useEffect(() => {
    setActiveStatusView('active')
    setDetailMode('mentorship')
    setSelectedRequestId(null)
  }, [role])

  useEffect(() => {
    if (role !== 'mentor') {
      mentorDefaultViewKey.current = null
      return
    }

    if (dataLoading) return

    const candidate = data?.candidateProfile ?? null
    if (!candidate || candidate.status === 'inactive') {
      mentorDefaultViewKey.current = null
      return
    }

    const nextKey = `${candidate.id}:${candidate.status}`
    if (mentorDefaultViewKey.current === nextKey) return

    mentorDefaultViewKey.current = nextKey
    setDetailMode('mentorProfile')
    setSelectedRequestId(null)
  }, [data?.candidateProfile, dataLoading, role])

  function changeStatusView(view: MentorshipStatusView) {
    setActiveStatusView(view)
    setDetailMode('mentorship')
    setSelectedRequestId(null)
  }

  function openMentorProfilePanel() {
    setDetailMode('mentorProfile')
  }

  function showAllMentorships() {
    setDetailMode('mentorship')
    setSelectedRequestId(null)
  }

  function openMentorApplicationModal() {
    setMentorApplicationArea('')
    setMentorApplicationSectorId(user?.sector_id ?? 'all')
    setMentorApplicationOpen(true)
  }

  function closeMentorApplicationModal() {
    if (submitting) return
    setMentorApplicationOpen(false)
  }

  function openEditMentorProfile() {
    const candidate = data?.candidateProfile
    if (!candidate) return

    setEditMentorArea(candidate.knowledge_area)
    setEditMentorSectorId(candidate.sector_id ?? 'all')
    setEditMentorOpen(true)
  }

  function closeEditMentorProfile() {
    if (submitting) return
    setEditMentorOpen(false)
  }

  if (loading) return <p className="ih-loading-page">Carregando...</p>

  async function handleCancelApplication() {
    if (!user?.id) return
    if (!window.confirm('Cancelar sua candidatura como mentor?')) return

    setSubmitting(true)
    setFeedback(null)

    try {
      await cancelMentorApplication(user.id)
      await loadData()
      setFeedback('Candidatura interrompida.')
    } catch {
      setFeedback('Erro ao cancelar candidatura.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeactivateMentorProfile() {
    if (!user?.id) return

    const confirmation = window.prompt(
      'Para deixar de aparecer no painel de mentores ativos, digite "sair" para confirmar. Suas mentorias já registradas serão mantidas no histórico.'
    )

    if (confirmation === null) return

    if (confirmation.trim().toLowerCase() !== 'sair') {
      setFeedback('Confirmação inválida. Seu perfil segue ativo no painel de mentores.')
      return
    }

    setSubmitting(true)
    setFeedback(null)

    try {
      await deactivateOwnMentorProfile(user.id)
      await loadData()
      setFeedback('Seu perfil foi removido do painel de mentores ativos.')
    } catch {
      setFeedback('Erro ao deixar de ser mentor.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleApplyAsMentor() {
    if (!user?.id) return

    setSubmitting(true)
    setFeedback(null)

    try {
      await applyAsMentor(
        user.id,
        mentorApplicationSectorId === 'all' ? null : mentorApplicationSectorId,
        mentorApplicationArea
      )
      await loadData()
      setMentorApplicationOpen(false)
      setMentorApplicationArea('')
      setDetailMode('mentorProfile')
      setFeedback('Candidatura enviada. Aguardando aprovação do gestor.')
    } catch (error) {
      setFeedback(getActionErrorMessage(error, 'Erro ao enviar candidatura.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCancelRequest(requestId: string) {
    if (!user?.id) return

    setRequestSubmittingId(requestId)
    setFeedback(null)

    try {
      await cancelMentorshipRequest(requestId, user.id)
      await loadData()
      setActiveStatusView('history')
      setSelectedRequestId(requestId)
      setFeedback('Solicitação de mentoria interrompida.')
    } catch {
      setFeedback('Erro ao cancelar solicitação.')
    } finally {
      setRequestSubmittingId(null)
    }
  }

  async function handleApproveRequest(requestId: string) {
    if (!user?.id) return

    setRequestSubmittingId(requestId)
    setFeedback(null)

    try {
      await approveMentorshipRequest(requestId, user.id)
      await loadData()
      setActiveStatusView('active')
      setSelectedRequestId(requestId)
      setFeedback('Solicitação aprovada. A mentoria está em andamento.')
    } catch {
      setFeedback('Erro ao aprovar solicitação.')
    } finally {
      setRequestSubmittingId(null)
    }
  }

  async function handleRejectRequest(requestId: string) {
    if (!user?.id) return
    if (!window.confirm('Recusar esta solicitação de mentoria?')) return

    setRequestSubmittingId(requestId)
    setFeedback(null)

    try {
      await rejectMentorshipRequest(requestId, user.id)
      await loadData()
      setActiveStatusView('history')
      setSelectedRequestId(requestId)
      setFeedback('Solicitação recusada.')
    } catch {
      setFeedback('Erro ao recusar solicitação.')
    } finally {
      setRequestSubmittingId(null)
    }
  }

  async function handleProposeMeeting(requestId: string, meetingDate: string) {
    if (!user?.id) return

    setRequestSubmittingId(requestId)
    setFeedback(null)

    try {
      await proposeNextMeetingDate(requestId, user.id, meetingDate)
      updateDraft(requestId, { nextMeetingDate: meetingDate })
      await loadData()
      setSelectedRequestId(requestId)
      setFeedback('Data proposta. Aguarde a aprovação do outro participante.')
    } catch (error) {
      setFeedback(getActionErrorMessage(error, 'Erro ao propor data da reunião.'))
    } finally {
      setRequestSubmittingId(null)
    }
  }

  async function handleApproveMeeting(requestId: string) {
    if (!user?.id) return

    setRequestSubmittingId(requestId)
    setFeedback(null)

    try {
      await approveNextMeetingDate(requestId, user.id)
      updateDraft(requestId, { nextMeetingDate: '' })
      await loadData()
      setSelectedRequestId(requestId)
      setFeedback('Data da próxima reunião aprovada.')
    } catch (error) {
      setFeedback(getActionErrorMessage(error, 'Erro ao aprovar data da reunião.'))
    } finally {
      setRequestSubmittingId(null)
    }
  }

  async function handleDeclineMeeting(requestId: string) {
    if (!user?.id) return

    setRequestSubmittingId(requestId)
    setFeedback(null)

    try {
      await declineNextMeetingDate(requestId, user.id)
      updateDraft(requestId, { nextMeetingDate: '' })
      await loadData()
      setSelectedRequestId(requestId)
      setFeedback('Data recusada. Sugira uma nova data quando fizer sentido.')
    } catch (error) {
      setFeedback(getActionErrorMessage(error, 'Erro ao recusar data da reunião.'))
    } finally {
      setRequestSubmittingId(null)
    }
  }

  async function handleCompleteRequest(requestId: string) {
    if (!user?.id) return

    setRequestSubmittingId(requestId)
    setFeedback(null)

    try {
      await completeMentorshipRequest(requestId, user.id)
      await loadData()
      setActiveStatusView('history')
      setSelectedRequestId(requestId)
      setFeedback('Mentoria marcada como finalizada.')
    } catch {
      setFeedback('Erro ao finalizar mentoria.')
    } finally {
      setRequestSubmittingId(null)
    }
  }

  async function handleSubmitEvaluation(requestId: string, rating: number, evaluationFeedback: string) {
    if (!user?.id) return

    setRequestSubmittingId(requestId)
    setFeedback(null)

    try {
      await submitMentorshipEvaluation(requestId, user.id, rating, evaluationFeedback)
      updateDraft(requestId, {
        rating: 0,
        feedback: '',
        evaluationTouched: false,
      })
      await loadData()
      setActiveStatusView('history')
      setDetailMode('mentorship')
      setSelectedRequestId(requestId)
      setFeedback('Avaliação registrada e notificação enviada para o outro participante.')
    } catch (error) {
      setFeedback(getActionErrorMessage(error, 'Erro ao registrar avaliação.'))
    } finally {
      setRequestSubmittingId(null)
    }
  }

  async function handleUpdateMentorProfile() {
    if (!user?.id) return

    setSubmitting(true)
    setFeedback(null)

    try {
      await updateMentorProfile(
        user.id,
        editMentorSectorId === 'all' ? null : editMentorSectorId,
        editMentorArea
      )
      await loadData()
      setEditMentorOpen(false)
      setFeedback('Perfil de mentor atualizado.')
    } catch {
      setFeedback('Erro ao atualizar perfil de mentor.')
    } finally {
      setSubmitting(false)
    }
  }

  const candidate = data?.candidateProfile ?? null
  const currentUserId = user?.id ?? ''
  const roleCopy = ROLE_COPY[role]
  const activeStatusCopy = STATUS_VIEW_COPY[activeStatusView]
  const selectedDraft = selectedRequest ? getDraft(drafts, selectedRequest.id) : EMPTY_DRAFT
  const hasMentorProfile = Boolean(candidate && candidate.status !== 'inactive')
  return (
    <>
      <div className="ih-dashboard-stack my-mentorships-page">
        {feedback && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              background: feedback.includes('Erro') ? 'rgba(229,62,62,.08)' : 'var(--mentorship-positive-soft)',
              color: feedback.includes('Erro') ? 'var(--danger)' : 'var(--mentorship-positive)',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {feedback}
          </div>
        )}

        {dataLoading ? (
          <p className="ih-loading-page" style={{ minHeight: 320 }}>
            Carregando mentorias...
          </p>
        ) : (
          <>
            <section className="my-mentorships-role-actions" aria-label="Ações de mentorias">
              {role === 'mentee' && (
                <Link
                  className="my-mentorships-profile-button"
                  href="/mentorships?view=discover"
                  prefetch={false}
                >
                  EXPLORAR MENTORES
                </Link>
              )}

              {role === 'mentor' && (
                <button
                  className={`my-mentorships-profile-button${hasMentorProfile && detailMode === 'mentorProfile' ? ' is-active' : ''}`}
                  type="button"
                  aria-pressed={hasMentorProfile && detailMode === 'mentorProfile'}
                  onClick={hasMentorProfile ? openMentorProfilePanel : openMentorApplicationModal}
                >
                  SER MENTOR
                </button>
              )}
            </section>

            <section className="my-mentorships-role-head">
              <div>
                <h2>{roleCopy.title}</h2>
                {roleCopy.subtitle && <p>{roleCopy.subtitle}</p>}
              </div>
            </section>

            <section className="my-mentorships-view-switcher" aria-label="Visões da jornada">
              <div className="my-mentorships-dropdown-label">Selecionar visão</div>
              <MentorshipStatusDropdown
                activeView={activeStatusView}
                counts={{
                  active: requestsByStatus.active.length,
                  pending: requestsByStatus.pending.length,
                  history: requestsByStatus.history.length,
                }}
                onChange={changeStatusView}
              />
            </section>

            <section className="my-mentorships-workspace">
              <div className="card">
                <div className="ih-section-head">
                  <div>
                    <div className="ih-section-title">{roleCopy.listTitle}</div>
                    <div style={{ marginTop: 3, color: 'var(--ink-3)', fontSize: 11.5 }}>
                      {activeStatusCopy.label} - {filteredRequests.length} registro{filteredRequests.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                <div className="ih-list">
                  {filteredRequests.map((request) => (
                    <RequestRow
                      key={request.id}
                      request={request}
                      currentUserId={currentUserId}
                      selected={detailMode === 'mentorship' && selectedRequest?.id === request.id}
                      onSelect={() => {
                        setSelectedRequestId(request.id)
                        setDetailMode('mentorship')
                      }}
                    />
                  ))}

                  {filteredRequests.length === 0 && (
                    <div className="ih-list-row" style={{ color: 'var(--ink-3)', fontSize: 12 }}>
                      {roleCopy.empty}
                    </div>
                  )}
                </div>
              </div>

              {detailMode === 'mentorProfile' ? (
                <MentorProfilePanel
                  candidate={candidate}
                  submitting={submitting}
                  onApply={openMentorApplicationModal}
                  onEdit={openEditMentorProfile}
                  onDeactivate={handleDeactivateMentorProfile}
                  onCancelApplication={handleCancelApplication}
                  onShowMentorships={showAllMentorships}
                />
              ) : (
                <DetailPanel
                  request={selectedRequest}
                  currentUserId={currentUserId}
                  draft={selectedDraft}
                  submitting={requestSubmittingId === selectedRequest?.id}
                  onDraftChange={updateDraft}
                  onApproveRequest={handleApproveRequest}
                  onRejectRequest={handleRejectRequest}
                  onCancelRequest={handleCancelRequest}
                  onCompleteRequest={handleCompleteRequest}
                  onProposeMeeting={handleProposeMeeting}
                  onApproveMeeting={handleApproveMeeting}
                  onDeclineMeeting={handleDeclineMeeting}
                  onSubmitEvaluation={handleSubmitEvaluation}
                />
              )}
            </section>
          </>
        )}
      </div>

      {editMentorOpen && (
        <div className="ih-modal-backdrop" onClick={closeEditMentorProfile}>
          <div className="ih-modal" onClick={(event) => event.stopPropagation()}>
            <div className="card-p">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
                <div>
                  <h2 style={{ margin: '0 0 4px', color: 'var(--ink)', fontSize: 18, fontWeight: 800 }}>
                    Editar perfil de mentor
                  </h2>
                  <p style={{ margin: 0, color: 'var(--ink-3)', fontSize: 12 }}>
                    Atualize seu escopo de atuação e o setor associado ao seu perfil.
                  </p>
                </div>
                <button className="ih-icon-btn" type="button" onClick={closeEditMentorProfile} aria-label="Fechar">
                  <Icon name="x" size={16} />
                </button>
              </div>

              <div style={{ display: 'grid', gap: 12 }}>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ color: 'var(--ink)', fontSize: 12, fontWeight: 800 }}>Escopo de mentoria</span>
                  <textarea
                    className="ih-textarea"
                    value={editMentorArea}
                    onChange={(event) => setEditMentorArea(event.target.value)}
                    placeholder="Ex.: Lean, dados, qualidade, regulatório"
                    style={{ minHeight: 112 }}
                  />
                </label>

                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ color: 'var(--ink)', fontSize: 12, fontWeight: 800 }}>Setor</span>
                  <select
                    className="ih-input"
                    value={editMentorSectorId}
                    onChange={(event) => setEditMentorSectorId(event.target.value)}
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
                  <button className="btn btn-muted btn-md" type="button" style={{ flex: 1 }} onClick={closeEditMentorProfile}>
                    Cancelar
                  </button>
                  <button
                    className="btn btn-accent btn-md"
                    type="button"
                    style={{ flex: 1 }}
                    disabled={editMentorArea.trim().length < 3 || submitting}
                    onClick={handleUpdateMentorProfile}
                  >
                    Salvar alterações
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {mentorApplicationOpen && typeof document !== 'undefined' && createPortal(
        <div className="ih-modal-backdrop my-mentorships-plain-backdrop" onClick={closeMentorApplicationModal}>
          <div className="ih-modal" onClick={(event) => event.stopPropagation()}>
            <div className="card-p">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
                <div>
                  <h2 style={{ margin: '0 0 4px', color: 'var(--ink)', fontSize: 18, fontWeight: 800 }}>
                    Cadastro como mentor
                  </h2>
                  <p style={{ margin: 0, color: 'var(--ink-3)', fontSize: 12 }}>
                    Informe seu escopo de atuação. O gestor precisa aprovar antes do seu perfil aparecer no painel.
                  </p>
                </div>
                <button className="ih-icon-btn" type="button" onClick={closeMentorApplicationModal} aria-label="Fechar">
                  <Icon name="x" size={16} />
                </button>
              </div>

              <div style={{ display: 'grid', gap: 12 }}>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ color: 'var(--ink)', fontSize: 12, fontWeight: 800 }}>Escopo de mentoria</span>
                  <textarea
                    className="ih-textarea"
                    value={mentorApplicationArea}
                    onChange={(event) => setMentorApplicationArea(event.target.value)}
                    placeholder="Ex.: Lean, dados, qualidade, regulatório"
                    style={{ minHeight: 112 }}
                  />
                </label>

                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ color: 'var(--ink)', fontSize: 12, fontWeight: 800 }}>Setor</span>
                  <select
                    className="ih-input"
                    value={mentorApplicationSectorId}
                    onChange={(event) => setMentorApplicationSectorId(event.target.value)}
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
                  <button className="btn btn-muted btn-md" type="button" style={{ flex: 1 }} onClick={closeMentorApplicationModal}>
                    Cancelar
                  </button>
                  <button
                    className="btn btn-accent btn-md"
                    type="button"
                    style={{ flex: 1 }}
                    disabled={mentorApplicationArea.trim().length < 3 || submitting}
                    onClick={handleApplyAsMentor}
                  >
                    Enviar cadastro
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
