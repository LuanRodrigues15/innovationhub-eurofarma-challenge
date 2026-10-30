'use client'

import Icon from '@/components/shared/Icon'
import type { HybridWeights, IdeaListItem, IdeaStatus, ImprovementArea } from '@/services/ideasService'
import { calculateHybridScoreWithWeights } from '@/utils/score'

const STATUS_META: Record<IdeaStatus, { label: string; color: string; badge: string }> = {
  sugestao:         { label: 'Sugestão',        color: '#7dd3fc', badge: 'badge-blue'  },
  em_analise:       { label: 'Em análise',       color: '#93c5fd', badge: 'badge-amber' },
  em_implantacao:   { label: 'Em implantação',   color: '#3b82f6', badge: 'badge-blue'  },
  conhecimento_org: { label: 'Gerou Valor',      color: '#0057A8', badge: 'badge-blue'  },
  em_refinamento:   { label: 'Não aprovada',      color: '#f97316', badge: 'badge-amber' },
}

const AREA_LABELS: Record<ImprovementArea, string> = {
  processo: 'Processo',
  custo: 'Custo',
  seguranca: 'Segurança',
  qualidade: 'Qualidade',
}

export function getIdeaStatusMeta(status: IdeaStatus) {
  return STATUS_META[status] ?? STATUS_META.sugestao
}

export function getImprovementAreaLabel(area: ImprovementArea) {
  return AREA_LABELS[area] ?? area
}

export function getVisibleAuthorName(idea: Pick<IdeaListItem, 'status' | 'author_name'>) {
  if (idea.status === 'sugestao' || idea.status === 'em_analise' || idea.status === 'em_refinamento') return 'Autor anônimo'
  return idea.author_name
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

type IdeaCardProps = {
  idea: IdeaListItem
  isManagerView?: boolean
  hybridWeights: HybridWeights
  currentUserId: string
  onValidate: (ideaId: string) => void | Promise<unknown>
  onOpenDetail: (ideaId: string) => void
  canManage?: boolean
  onApprove?: (ideaId: string) => void
  onReject?: (ideaId: string) => void
  hasValidated?: boolean
  isValidatePending?: boolean
  userHasRejected?: boolean
  onDownvote?: (ideaId: string) => void
}

export default function IdeaCard({
  idea,
  isManagerView = false,
  hybridWeights,
  currentUserId,
  onValidate,
  onOpenDetail,
  canManage = false,
  onApprove,
  onReject,
  hasValidated = false,
  isValidatePending = false,
  userHasRejected = false,
  onDownvote,
}: IdeaCardProps) {
  const meta = getIdeaStatusMeta(idea.status)
  const isOwn = currentUserId === idea.author_id
  const hybridScore =
    idea.hybrid_score ?? calculateHybridScoreWithWeights(idea.ai_score, idea.social_score, hybridWeights)

  return (
    <article
      className="ih-idea-card"
      role="button"
      tabIndex={0}
      onClick={() => onOpenDetail(idea.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpenDetail(idea.id)
        }
      }}
      style={{
        borderLeft: `3px solid ${meta.color}`,
        cursor: 'pointer',
      }}
    >
      <div className="card-p">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 9 }}>
              <h2
                style={{
                  margin: 0,
                  color: 'var(--ink)',
                  fontSize: 15,
                  fontWeight: 800,
                  lineHeight: 1.3,
                  flex: '1 1 260px',
                }}
              >
                {idea.title}
              </h2>
              <span
                className="tag"
                style={{ color: meta.color, borderColor: `${meta.color}35`, background: `${meta.color}12` }}
              >
                {getImprovementAreaLabel(idea.improvement_area)}
              </span>
            </div>

            <p
              style={{
                margin: '0 0 14px',
                color: 'var(--ink-2)',
                fontSize: 13,
                lineHeight: 1.6,
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 2,
                overflow: 'hidden',
              }}
            >
              {idea.summary}
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isManagerView ? 'repeat(3, minmax(0, 1fr))' : 'repeat(2, minmax(0, 1fr))',
                gap: 10,
                marginBottom: 12,
              }}
            >
              <ScoreMini label="AI Score" value={idea.ai_score} color="var(--accent)" />
              <ScoreMini label="Social" value={idea.social_score} color="var(--green)" />
              {isManagerView && (
                <ScoreMini label="Híbrido" value={hybridScore} color={hybridScore >= 80 ? 'var(--green)' : meta.color} />
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--ink-3)', fontSize: 11.5, fontWeight: 700 }}>
                {idea.sector_name}
              </span>
              <span className={`badge ${meta.badge}`}>{meta.label}</span>
              {isOwn && <span className="badge badge-blue">Sua ideia</span>}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {isManagerView && (
                  <>
                    <button
                      className="btn btn-sm btn-success"
                      type="button"
                      disabled={!canManage || idea.status !== 'em_analise'}
                      onClick={(event) => {
                        event.stopPropagation()
                        onApprove?.(idea.id)
                      }}
                      title={!canManage ? 'Disponivel apenas para ideias do seu setor' : 'Aprovar ideia'}
                    >
                      <Icon name="check" size={15} />
                      Aprovar
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      type="button"
                      disabled={!canManage || idea.status !== 'em_analise'}
                      onClick={(event) => {
                        event.stopPropagation()
                        onReject?.(idea.id)
                      }}
                      title={!canManage ? 'Disponivel apenas para ideias do seu setor' : 'Rejeitar ideia'}
                    >
                      <Icon name="x" size={15} />
                      Rejeitar
                    </button>
                  </>
                )}

                <button
                  className={`btn btn-sm ${isOwn ? 'btn-muted' : hasValidated ? 'btn-success' : 'btn-accent'}`}
                  type="button"
                  disabled={isOwn || isValidatePending}
                  aria-pressed={hasValidated}
                  onClick={(event) => {
                    event.stopPropagation()
                    onValidate(idea.id)
                  }}
                  title={
                    isOwn
                      ? 'Voce nao valida a propria ideia'
                      : hasValidated
                        ? 'Remover validação'
                        : 'Validar ideia'
                  }
                  style={{
                    opacity: isOwn || isValidatePending ? 0.5 : 1,
                    cursor: isOwn || isValidatePending ? 'not-allowed' : 'pointer',
                  }}
                >
                  <Icon name={hasValidated ? 'check-circle' : 'heart'} size={15} />
                  {isValidatePending ? 'Validando...' : hasValidated ? 'Validado' : 'Validar'}
                </button>

                {!isManagerView && onDownvote && (
                  <button
                    className="btn btn-sm btn-muted"
                    type="button"
                    aria-label="Não é relevante"
                    aria-pressed={userHasRejected}
                    onClick={(event) => {
                      event.stopPropagation()
                      onDownvote(idea.id)
                    }}
                    style={{
                      opacity: userHasRejected ? 1 : 0.6,
                      color: userHasRejected ? 'var(--danger)' : undefined,
                    }}
                    title={userHasRejected ? 'Remover sinalização' : 'Não é relevante'}
                  >
                    ▼
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 13,
            paddingTop: 12,
            borderTop: '1px solid var(--line)',
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            color: 'var(--ink-3)',
            fontSize: 11.5,
            fontWeight: 600,
          }}
        >
          <span>{getVisibleAuthorName(idea)}</span>
          <span>{formatDate(idea.created_at)}</span>
        </div>
      </div>
    </article>
  )
}

function ScoreMini({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="ih-kv" style={{ padding: 10 }}>
      <div className="ih-kv-label">{label}</div>
      <div className="ih-kv-value tabnum" style={{ color, fontSize: 18, lineHeight: 1 }}>
        {value}
      </div>
    </div>
  )
}
