'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useUser } from '@/hooks/useUser'
import Icon, { type IconName } from '@/components/shared/Icon'
import ProfileShell from '@/components/shared/ProfileShell'
import {
  fetchModerationAlerts,
  updateModerationAlertStatus,
  type ModerationAlert,
} from '@/services/managementService'
import { createNotification } from '@/services/notificationService'

type AlertStatus = 'pending' | 'warned' | 'blocked'
type AlertFilter = 'all' | AlertStatus

type PendingAction = {
  alert: ModerationAlert
  status: AlertStatus
} | null

const FILTERS: Array<{ value: AlertFilter; label: string; icon: IconName }> = [
  { value: 'all', label: 'Todos', icon: 'layers' },
  { value: 'pending', label: 'Pendentes', icon: 'bell' },
  { value: 'warned', label: 'Avisados', icon: 'check-circle' },
  { value: 'blocked', label: 'Bloqueados', icon: 'shield' },
]

const STATUS_META: Record<AlertStatus, { label: string; tone: string; desc: string; icon: IconName }> = {
  pending: {
    label: 'Pendente',
    tone: 'pending',
    desc: 'Aguardando revisão do Admin.',
    icon: 'bell',
  },
  warned: {
    label: 'Avisado',
    tone: 'warned',
    desc: 'Usuário já recebeu aviso de conduta.',
    icon: 'check-circle',
  },
  blocked: {
    label: 'Bloqueio registrado',
    tone: 'blocked',
    desc: 'Status administrativo do alerta. Não bloqueia login automaticamente.',
    icon: 'shield',
  },
}

function isAlertStatus(value: string): value is AlertStatus {
  return value === 'pending' || value === 'warned' || value === 'blocked'
}

function getStatusMeta(status: string) {
  return STATUS_META[isAlertStatus(status) ? status : 'pending']
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function normalizeText(value: string | null | undefined) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function actionLabel(status: AlertStatus) {
  if (status === 'blocked') return 'Registrar bloqueio do alerta'
  if (status === 'warned') return 'Registrar aviso de conduta'
  return 'Reabrir análise'
}

function actionFeedback(status: AlertStatus) {
  if (status === 'blocked') return 'Bloqueio registrado no alerta.'
  if (status === 'warned') return 'Aviso registrado no alerta.'
  return 'Alerta reaberto para análise.'
}

function actionDescription(status: AlertStatus, userName: string) {
  if (status === 'blocked') return `O alerta de ${userName} ficará com bloqueio registrado para auditoria.`
  if (status === 'warned') return `O alerta de ${userName} ficará com aviso de conduta registrado.`
  return `O alerta de ${userName} voltará para a fila de análise.`
}

export default function AdminModerationPage() {
  const { user, loading: userLoading } = useUser()
  const [alerts, setAlerts] = useState<ModerationAlert[]>([])
  const [filter, setFilter] = useState<AlertFilter>('all')
  const [searchText, setSearchText] = useState('')
  const [loading, setLoading] = useState(true)
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)

  const loadAlerts = useCallback(async () => {
    setLoading(true)
    setFeedback(null)

    try {
      const data = await fetchModerationAlerts(filter)
      setAlerts(data)
    } catch {
      setFeedback('Erro ao carregar alertas.')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    loadAlerts()
  }, [loadAlerts])

  const metrics = useMemo(() => {
    const pending = alerts.filter((alert) => alert.status === 'pending').length
    const warned = alerts.filter((alert) => alert.status === 'warned').length
    const blocked = alerts.filter((alert) => alert.status === 'blocked').length
    const recurrent = alerts.filter((alert) => alert.occurrence_count >= 2).length

    return { pending, warned, blocked, recurrent }
  }, [alerts])

  const filteredAlerts = useMemo(() => {
    const term = normalizeText(searchText.trim())
    if (!term) return alerts

    return alerts.filter((alert) => {
      const searchable = normalizeText(`${alert.user_name} ${alert.user_email ?? ''} ${alert.content} ${alert.status}`)
      return searchable.includes(term)
    })
  }, [alerts, searchText])

  const selectedAlert = pendingAction?.alert ?? null
  const pendingCount = alerts.filter((alert) => alert.status === 'pending').length

  if (userLoading) return <p className="ih-loading-page">Carregando...</p>

  function openAction(alert: ModerationAlert, status: AlertStatus) {
    setPendingAction({ alert, status })
  }

  async function handleConfirmAction() {
    if (!pendingAction) return

    const { alert, status } = pendingAction
    setSubmittingId(alert.id)
    setFeedback(null)

    const previous = alerts
    setAlerts((current) => current.map((item) => (item.id === alert.id ? { ...item, status } : item)))

    try {
      await updateModerationAlertStatus(alert.id, status)

      if (status === 'warned') {
        await createNotification({
          userId: alert.user_id,
          type: 'moderation_warning',
          title: 'Aviso de conduta',
          body: 'Você recebeu um aviso de conduta pelo conteúdo enviado. Por favor, revise as diretrizes da plataforma.',
          href: null,
          referenceId: alert.id,
        })
      }

      setPendingAction(null)
      setFeedback(actionFeedback(status))
    } catch {
      setAlerts(previous)
      setFeedback('Erro ao atualizar alerta.')
    } finally {
      setSubmittingId(null)
    }
  }

  return (
    <ProfileShell
      profile="admin"
      title="Moderação"
      subtitle="Alertas de conteúdo com identidade visível para auditoria"
      user={user}
      notifCount={pendingCount}
    >
      <div className="admin-moderation-page">
        {feedback && (
          <div className={`admin-moderation-feedback ${feedback.includes('Erro') ? 'is-error' : ''}`}>
            {feedback}
          </div>
        )}

        <section className="admin-moderation-header">
          <div>
            <span className="admin-moderation-kicker">Governança de IA</span>
            <h2>Fila de alertas da Eura</h2>
            <p>
              Revisão dos sinais de conteúdo inadequado registrados pelo fluxo de IA Innovation.
              A identidade é exibida apenas para auditoria administrativa.
            </p>
          </div>
          <div className="admin-moderation-note">
            <Icon name="shield" size={17} />
            <span>“Bloqueado” altera o status do alerta; não bloqueia login automaticamente.</span>
          </div>
        </section>

        <section className="admin-moderation-metrics">
          <MetricCard icon="bell" label="Pendentes" value={metrics.pending} tone="pending" />
          <MetricCard icon="check-circle" label="Avisados" value={metrics.warned} tone="warned" />
          <MetricCard icon="shield" label="Bloqueados" value={metrics.blocked} tone="blocked" />
          <MetricCard icon="trending-up" label="Reincidências" value={metrics.recurrent} tone="recurrent" />
        </section>

        <section className="admin-moderation-toolbar">
          <div className="admin-moderation-tabs" role="tablist" aria-label="Filtros de moderação">
            {FILTERS.map((item) => (
              <button
                key={item.value}
                className={filter === item.value ? 'is-active' : ''}
                type="button"
                onClick={() => setFilter(item.value)}
              >
                <Icon name={item.icon} size={14} />
                {item.label}
              </button>
            ))}
          </div>

          <label className="admin-moderation-search">
            <Icon name="eye" size={14} />
            <input
              value={searchText}
              placeholder="Buscar por usuário, e-mail ou conteúdo"
              onChange={(event) => setSearchText(event.target.value)}
            />
          </label>
        </section>

        <section className="admin-moderation-list">
          <div className="admin-moderation-list-head">
            <div>
              <h3>Alertas encontrados</h3>
              <span>{filteredAlerts.length} item(ns) na visualização atual</span>
            </div>
            <button className="btn btn-muted btn-sm" type="button" disabled={loading} onClick={loadAlerts}>
              <Icon name="refresh-cw" size={14} />
              Atualizar
            </button>
          </div>

          {loading ? (
            <p className="ih-loading-page admin-moderation-loading">Carregando alertas...</p>
          ) : filteredAlerts.length === 0 ? (
            <div className="admin-moderation-empty">
              <Icon name="shield" size={22} />
              <strong>Nenhum alerta encontrado</strong>
              <span>Ajuste os filtros ou aguarde novos sinais do IA Innovation.</span>
            </div>
          ) : (
            <div className="admin-moderation-cards">
              {filteredAlerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  submitting={submittingId === alert.id}
                  onAction={openAction}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {pendingAction && selectedAlert && (
        <div className="ih-modal-backdrop" onClick={() => !submittingId && setPendingAction(null)}>
          <div className="admin-moderation-confirm" onClick={(event) => event.stopPropagation()}>
            <div className="admin-moderation-confirm-head">
              <span className={`is-${getStatusMeta(pendingAction.status).tone}`}>
                <Icon name={getStatusMeta(pendingAction.status).icon} size={20} />
              </span>
              <div>
                <h2>{actionLabel(pendingAction.status)}</h2>
                <p>{actionDescription(pendingAction.status, selectedAlert.user_name)}</p>
              </div>
            </div>

            <div className="admin-moderation-confirm-body">
              <div>
                <span>Usuário</span>
                <strong>{selectedAlert.user_name}</strong>
                <em>{selectedAlert.user_email ?? 'Sem e-mail'}</em>
              </div>
              <div>
                <span>Conteúdo sinalizado</span>
                <p>{selectedAlert.content}</p>
              </div>
            </div>

            {pendingAction.status === 'blocked' && (
              <div className="admin-moderation-warning">
                <Icon name="shield" size={16} />
                <span>Esta ação não bloqueia a autenticação do usuário; ela marca o alerta como bloqueado para auditoria.</span>
              </div>
            )}

            <div className="admin-moderation-confirm-actions">
              <button className="btn btn-muted btn-md" type="button" disabled={!!submittingId} onClick={() => setPendingAction(null)}>
                Cancelar
              </button>
              <button
                className={`btn btn-md admin-moderation-confirm-submit is-${getStatusMeta(pendingAction.status).tone}`}
                type="button"
                disabled={!!submittingId}
                onClick={handleConfirmAction}
              >
                <Icon name={pendingAction.status === 'blocked' ? 'shield' : 'check'} size={15} />
                {submittingId ? 'Atualizando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProfileShell>
  )
}

function MetricCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: IconName
  label: string
  value: number
  tone: string
}) {
  return (
    <div className={`admin-moderation-metric is-${tone}`}>
      <span>
        <Icon name={icon} size={17} />
      </span>
      <div>
        <em>{label}</em>
        <strong>{value}</strong>
      </div>
    </div>
  )
}

function AlertCard({
  alert,
  submitting,
  onAction,
}: {
  alert: ModerationAlert
  submitting: boolean
  onAction: (alert: ModerationAlert, status: AlertStatus) => void
}) {
  const meta = getStatusMeta(alert.status)
  const currentStatus = isAlertStatus(alert.status) ? alert.status : 'pending'
  const initials = getInitials(alert.user_name || 'Usuário')
  const showWarnAction = currentStatus === 'pending'
  const showBlockAction = currentStatus === 'pending' || currentStatus === 'warned'
  const showReopenAction = currentStatus === 'warned' || currentStatus === 'blocked'

  return (
    <article className={`admin-moderation-card is-${meta.tone}`}>
      <div className="admin-moderation-user">
        <span className="admin-moderation-avatar">{initials || 'U'}</span>
        <div>
          <strong>{alert.user_name}</strong>
          <span>{alert.user_email ?? 'Sem e-mail cadastrado'}</span>
        </div>
      </div>

      <div className="admin-moderation-content">
        <div className="admin-moderation-status-row">
          <span className={`admin-moderation-status is-${meta.tone}`}>
            <Icon name={meta.icon} size={13} />
            {meta.label}
          </span>
          <span className="admin-moderation-date">{formatDate(alert.created_at)}</span>
        </div>
        <p>{alert.content}</p>

        <div className="admin-moderation-detail-strip">
          <span>
            <em>Ocorrências</em>
            <strong>{alert.occurrence_count}</strong>
          </span>
          <span className="is-state">
            <em>Estado</em>
            <strong>{meta.desc}</strong>
          </span>
        </div>
      </div>

      <div className="admin-moderation-card-actions" aria-label={`Tratativas para ${alert.user_name}`}>
        <span>Tratativa</span>
        <div className="admin-moderation-action-buttons">
          {showWarnAction && (
            <button className="btn btn-muted btn-sm" type="button" disabled={submitting} onClick={() => onAction(alert, 'warned')}>
              <Icon name="check" size={13} />
              Registrar aviso
            </button>
          )}
          {showBlockAction && (
            <button className="btn btn-danger btn-sm" type="button" disabled={submitting} onClick={() => onAction(alert, 'blocked')}>
              <Icon name="shield" size={13} />
              Registrar bloqueio
            </button>
          )}
          {showReopenAction && (
            <button className="btn btn-muted btn-sm" type="button" disabled={submitting} onClick={() => onAction(alert, 'pending')}>
              <Icon name="refresh-cw" size={13} />
              Reabrir análise
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
