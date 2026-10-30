'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import {
  addComment,
  fetchDefaultHybridWeights,
  fetchIdeaById,
  type HybridWeights,
  type IdeaDetail,
} from '@/services/ideasService'
import {
  approveIdea,
  moveToKnowledge,
  rejectIdea,
} from '@/services/managementService'
import {
  getIdeaStatusMeta,
  getImprovementAreaLabel,
  getVisibleAuthorName,
} from '@/components/shared/IdeaCard'
import Icon from '@/components/shared/Icon'
import ProfileShell from '@/components/shared/ProfileShell'
import { calculateHybridScoreWithWeights } from '@/utils/score'

type ActionModal = 'approve' | 'reject' | 'knowledge' | null

export default function ManagerIdeaDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const { user, loading: userLoading } = useUser()
  const [idea, setIdea] = useState<IdeaDetail | null>(null)
  const [weights, setWeights] = useState<HybridWeights>({ ai: 0.7, social: 0.3 })
  const [comment, setComment] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [modal, setModal] = useState<ActionModal>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const hybridScore = useMemo(() => {
    if (!idea) return 0
    return calculateHybridScoreWithWeights(idea.ai_score, idea.social_score, weights)
  }, [idea, weights])

  const canManage = !!idea && (user?.role === 'admin' || idea.sector_id === user?.sector_id)

  async function loadIdea() {
    setLoading(true)
    setFeedback(null)

    try {
      const [ideaData, weightData] = await Promise.all([
        fetchIdeaById(params.id),
        fetchDefaultHybridWeights(),
      ])
      setIdea(ideaData)
      setWeights(weightData)
    } catch {
      setFeedback('Erro ao carregar a ideia.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadIdea()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  if (userLoading || loading) return <p className="ih-loading-page">Carregando...</p>

  async function handleAction() {
    if (!idea || !user?.id || !modal) return

    setSubmitting(true)
    setFeedback(null)

    try {
      if (modal === 'approve') {
        await approveIdea(idea.id, user.id)
        setFeedback('Ideia aprovada e enviada para implantação.')
      }

      if (modal === 'reject') {
        await rejectIdea(idea.id, user.id, rejectReason)
        setFeedback('Rejeição registrada com justificativa.')
      }

      if (modal === 'knowledge') {
        await moveToKnowledge(idea.id, user.id)
        setFeedback('Ideia movida para Conhecimento Organizacional.')
      }

      setModal(null)
      setRejectReason('')
      await loadIdea()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao executar ação.'
      setFeedback(message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleComment() {
    if (!idea || !user?.id || !comment.trim()) return

    setSubmitting(true)
    setFeedback(null)

    try {
      const newComment = await addComment(idea.id, user.id, comment)
      setIdea({ ...idea, comments: [...idea.comments, newComment] })
      setComment('')
      setFeedback('Comentário publicado.')
    } catch {
      setFeedback('Erro ao publicar comentário.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!idea) {
    return (
      <ProfileShell profile="gestor" title="Detalhe da Ideia" subtitle="Documento completo da proposta" user={user}>
        <div className="card card-p">
          <p style={{ margin: 0, color: 'var(--ink-3)' }}>Ideia não encontrada.</p>
        </div>
      </ProfileShell>
    )
  }

  const meta = getIdeaStatusMeta(idea.status)

  return (
    <ProfileShell
      profile="gestor"
      title="Detalhe da Ideia"
      subtitle="Score Híbrido, decisão e histórico da proposta"
      user={user}
      notifCount={3}
    >
      <div className="ih-dashboard-stack">
        <button
          className="btn btn-muted btn-sm"
          type="button"
          onClick={() => router.push('/manager/dashboard/hub')}
          style={{ width: 'fit-content' }}
        >
          <Icon name="chevron-left" size={15} />
          Voltar
        </button>

        {feedback && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              background: feedback.includes('Erro') || feedback.includes('não pode') || feedback.includes('nao pode')
                ? 'rgba(229,62,62,.08)'
                : 'rgba(0,166,81,.08)',
              color: feedback.includes('Erro') || feedback.includes('não pode') || feedback.includes('nao pode')
                ? 'var(--danger)'
                : 'var(--green)',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {feedback}
          </div>
        )}

        <section className="ih-two-col">
          <article className="card" style={{ borderTop: `3px solid ${meta.color}` }}>
            <div className="ih-section-head">
              <div>
                <div className="ih-section-title">{idea.title}</div>
                <div className="ih-topbar-sub">
                  {idea.sector_name} · {getVisibleAuthorName(idea)}
                </div>
              </div>
              <span className={`badge ${meta.badge}`}>{meta.label}</span>
            </div>
            <div className="card-p" style={{ display: 'grid', gap: 14 }}>
              <DocBlock label="Resumo" value={idea.summary} />
              <DocBlock label="Benefícios" value={idea.benefits} />

              <div className="ih-kv-grid">
                <div className="ih-kv">
                  <div className="ih-kv-label">Complexidade</div>
                  <div className="ih-kv-value">{idea.complexity}</div>
                </div>
                <div className="ih-kv">
                  <div className="ih-kv-label">Área de melhoria</div>
                  <div className="ih-kv-value">{getImprovementAreaLabel(idea.improvement_area)}</div>
                </div>
              </div>

              {idea.rejection_reason && (
                <DocBlock label="Justificativa de rejeição" value={idea.rejection_reason} />
              )}
            </div>
          </article>

          <aside className="card">
            <div className="ih-section-head">
              <div className="ih-section-title">Decisão</div>
              {!canManage && <span className="badge badge-red">Outro setor</span>}
            </div>
            <div className="card-p" style={{ display: 'grid', gap: 14 }}>
              <div style={{ display: 'grid', justifyItems: 'center', gap: 8 }}>
                <div
                  className="ih-score-ring"
                  style={
                    {
                      '--score-size': '92px',
                      '--score-color': idea.ai_score >= 71 ? 'var(--green)' : 'var(--accent)',
                    } as CSSProperties
                  }
                >
                  {idea.ai_score}
                </div>
                <div className="stat-lbl">AI Score</div>
              </div>

              <div className="ih-kv-grid">
                <div className="ih-kv">
                  <div className="ih-kv-label">Social</div>
                  <div className="ih-kv-value tabnum">{idea.social_score}</div>
                </div>
                <div className="ih-kv">
                  <div className="ih-kv-label">Híbrido</div>
                  <div className="ih-kv-value tabnum">{hybridScore}</div>
                </div>
              </div>

              <button
                className="btn btn-success btn-md"
                type="button"
                disabled={!canManage || idea.status !== 'em_analise' || submitting}
                onClick={() => setModal('approve')}
              >
                <Icon name="check" size={16} />
                Aprovar
              </button>
              <button
                className="btn btn-danger btn-md"
                type="button"
                disabled={!canManage || idea.status !== 'em_analise' || submitting}
                onClick={() => setModal('reject')}
              >
                <Icon name="x" size={16} />
                Rejeitar
              </button>
              {idea.status === 'em_implantacao' && (
                <button
                  className="btn btn-accent btn-md"
                  type="button"
                  disabled={!canManage || submitting}
                  onClick={() => setModal('knowledge')}
                >
                  <Icon name="award" size={16} />
                  Mover para Conhecimento Org.
                </button>
              )}
            </div>
          </aside>
        </section>

        <section className="card">
          <div className="ih-section-head">
            <div className="ih-section-title">Comentários</div>
            <span className="badge badge-gray">{idea.comments.length}</span>
          </div>
          <div className="card-p" style={{ display: 'grid', gap: 12 }}>
            {idea.comments.map((item) => (
              <div className="ih-kv" key={item.id}>
                <div className="ih-kv-label">{item.author_name}</div>
                <div className="ih-kv-value" style={{ fontSize: 12.5, lineHeight: 1.6, fontWeight: 600 }}>
                  {item.content}
                </div>
              </div>
            ))}

            {idea.comments.length === 0 && (
              <div style={{ color: 'var(--ink-3)', fontSize: 12 }}>Ainda não há comentários.</div>
            )}

            <textarea
              className="ih-textarea"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Escreva um comentário..."
            />
            <button
              className="btn btn-accent btn-md"
              type="button"
              disabled={submitting || !comment.trim()}
              onClick={handleComment}
              style={{ width: 'fit-content' }}
            >
              <Icon name="send" size={15} />
              Comentar
            </button>
          </div>
        </section>
      </div>

      {modal && (
        <div className="ih-modal-backdrop" onClick={() => setModal(null)}>
          <div className="ih-modal" onClick={(event) => event.stopPropagation()}>
            <div className="card-p">
              <h2 style={{ margin: '0 0 8px', color: 'var(--ink)', fontSize: 18, fontWeight: 800 }}>
                {modal === 'approve' && 'Confirmar aprovação'}
                {modal === 'reject' && 'Rejeitar ideia'}
                {modal === 'knowledge' && 'Mover para Conhecimento Organizacional'}
              </h2>
              <p style={{ margin: '0 0 16px', color: 'var(--ink-2)', fontSize: 13, lineHeight: 1.6 }}>
                {idea.title}
              </p>

              {modal === 'reject' && (
                <textarea
                  className="ih-textarea"
                  value={rejectReason}
                  onChange={(event) => setRejectReason(event.target.value)}
                  placeholder="Informe a justificativa obrigatória..."
                  style={{ marginBottom: 14 }}
                />
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-muted btn-md" type="button" style={{ flex: 1 }} onClick={() => setModal(null)}>
                  Cancelar
                </button>
                <button
                  className="btn btn-success btn-md"
                  type="button"
                  style={{ flex: 1 }}
                  disabled={submitting || (modal === 'reject' && !rejectReason.trim())}
                  onClick={handleAction}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ProfileShell>
  )
}

function DocBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="ih-kv">
      <div className="ih-kv-label">{label}</div>
      <div className="ih-kv-value" style={{ fontSize: 13, lineHeight: 1.7, fontWeight: 600 }}>
        {value}
      </div>
    </div>
  )
}
