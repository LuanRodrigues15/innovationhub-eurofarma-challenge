'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { useUser } from '@/hooks/useUser'
import Icon, { type IconName } from '@/components/shared/Icon'
import ProfileShell from '@/components/shared/ProfileShell'
import { fetchEmployeeDashboardData, type DashboardData } from '@/services/ideasService'
import { createClient } from '@/lib/supabase/client'
import { fetchMyMentorships, type MyMentorshipsData } from '@/services/mentorshipService'

const LEVEL_NAMES: Record<number, string> = {
  1: 'Aprendiz',
  2: 'Pensador',
  3: 'Inovador',
  4: 'Especialista',
  5: 'Referência',
}

const LEVEL_THRESHOLDS: [number, number, number][] = [
  [1, 0, 500],
  [2, 501, 1500],
  [3, 1501, 5000],
  [4, 5001, 10000],
  [5, 10001, 10001],
]

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  sugestao: { label: 'Sugestão', color: '#0057A8' },
  em_analise: { label: 'Em análise', color: '#7C3AED' },
  em_implantacao: { label: 'Em implantação', color: '#1D4ED8' },
  conhecimento_org: { label: 'Gerou Valor', color: '#B88A2B' },
}

type MentorshipSummary = {
  active: number
  pending: number
  history: number
  activeAsMentor: number
  activeAsMentee: number
  pendingForMe: number
  pendingFromMe: number
  candidateProfile: MyMentorshipsData['candidateProfile']
}

function accentStyle(color: string) {
  return { '--accent-color': color } as CSSProperties
}

function statusStyle(color: string) {
  return { '--dash-status-color': color } as CSSProperties
}

function getProgressPercent(points: number, level: number): number {
  if (level >= 5) return 100
  const current = LEVEL_THRESHOLDS.find(([itemLevel]) => itemLevel === level)
  const next = LEVEL_THRESHOLDS.find(([itemLevel]) => itemLevel === level + 1)
  if (!current || !next) return 0
  const progress = ((points - current[1]) / (next[1] - current[1])) * 100
  return Math.min(100, Math.max(0, progress))
}

function getNextLevelThreshold(level: number): number | null {
  const next = LEVEL_THRESHOLDS.find(([itemLevel]) => itemLevel === level + 1)
  return next ? next[1] : null
}

function formatNumber(value: number) {
  return value.toLocaleString('pt-BR')
}

export default function EmployeeDashboardPage() {
  const { user, loading } = useUser()
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [sectorName, setSectorName] = useState<string>('')
  const [mentorshipSummary, setMentorshipSummary] = useState<MentorshipSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function loadDashboard() {
      if (!user?.id) {
        setDataLoading(false)
        return
      }

      setDataLoading(true)
      setError(null)

      try {
        const [data, sectorResult, mentorships] = await Promise.all([
          fetchEmployeeDashboardData(user.id, user.sector_id),
          user.sector_id
            ? createClient().from('sectors').select('name').eq('id', user.sector_id).maybeSingle()
            : Promise.resolve({ data: null }),
          fetchMyMentorships(user.id),
        ])

        if (!active) return
        setDashboard(data)
        if (sectorResult.data && 'name' in sectorResult.data) {
          setSectorName((sectorResult.data as { name: string }).name)
        }
        setMentorshipSummary({
          active: mentorships.active.length,
          pending: mentorships.pending.length,
          history: mentorships.history.length,
          activeAsMentor: mentorships.active.filter((request) => request.mentor_id === user.id).length,
          activeAsMentee: mentorships.active.filter((request) => request.mentee_id === user.id).length,
          pendingForMe: mentorships.pending.filter((request) => request.mentor_id === user.id).length,
          pendingFromMe: mentorships.pending.filter((request) => request.mentee_id === user.id).length,
          candidateProfile: mentorships.candidateProfile,
        })
      } catch {
        if (!active) return
        setError('Erro ao carregar dados do dashboard.')
      } finally {
        if (active) setDataLoading(false)
      }
    }

    loadDashboard()
    return () => { active = false }
  }, [user?.id, user?.sector_id])

  if (loading) return <p className="ih-loading-page">Carregando...</p>

  const points = user?.points ?? 0
  const level = user?.level ?? 1
  const levelName = LEVEL_NAMES[level] ?? 'Aprendiz'
  const progressPercent = getProgressPercent(points, level)
  const nextThreshold = getNextLevelThreshold(level)
  const isMaxLevel = level >= 5
  const remainingPoints = nextThreshold ? Math.max(0, nextThreshold - points) : 0

  const stats = [
    {
      label: 'Pontos acumulados',
      value: formatNumber(points),
      sub: 'Saldo disponível',
      color: '#0057A8',
      icon: 'award',
    },
    {
      label: 'Ideias submetidas',
      value: String(dashboard?.ideasSubmitted ?? 0),
      sub: 'Publicadas no Hub',
      color: '#0057A8',
      icon: 'lightbulb',
    },
    {
      label: 'Validações dadas',
      value: String(dashboard?.validationsGiven ?? 0),
      sub: 'A colegas',
      color: '#0057A8',
      icon: 'check-circle',
    },
    {
      label: 'Cursos concluídos',
      value: String(dashboard?.coursesCompleted ?? 0),
      sub: 'Quizzes aprovados',
      color: '#0057A8',
      icon: 'cpu',
    },
  ] satisfies Array<{ label: string; value: string; sub: string; color: string; icon: IconName }>

  const rankingCards = [
    {
      label: 'Ranking global',
      value: dashboard?.rankingPosition ? `#${dashboard.rankingPosition}` : '—',
      sub: 'Todos os colaboradores visíveis',
      icon: 'trending-up',
      href: '/leaderboard',
    },
    {
      label: 'Ranking do setor',
      value: dashboard?.rankingSectorPosition ? `#${dashboard.rankingSectorPosition}` : '—',
      sub: sectorName || 'Setor não definido',
      icon: 'users',
      href: '/leaderboard',
    },
  ] satisfies Array<{ label: string; value: string; sub: string; icon: IconName; href: string }>

  return (
    <ProfileShell
      profile="funcionario"
      title="Início"
      subtitle="Visão geral da sua jornada de inovação"
      user={user}
      points={points}
      pageBodyClass="light-page"
    >
      <div className="ih-dashboard-stack employee-dashboard-page">
        {error && (
          <div className="dashboard-alert">
            {error}
          </div>
        )}

        <section className="dashboard-overview-grid">
          <div className="card dashboard-level-card">
            <div className="card-p">
              <div className="dashboard-card-kicker">Sua jornada</div>
              <div className="dashboard-level-head">
                <div>
                  <div className="dashboard-level-title">NV {level} · {levelName}</div>
                  <p>
                    {isMaxLevel
                      ? 'Você atingiu o nível máximo da trilha de inovação.'
                      : `${progressPercent.toFixed(0)}% até ${LEVEL_NAMES[level + 1] ?? 'o próximo nível'}`}
                  </p>
                </div>
                <div className="dashboard-level-badge">
                  <Icon name="award" size={18} />
                  <span>{formatNumber(points)} pts</span>
                </div>
              </div>

              <div className="dashboard-progress-meta">
                <span>{LEVEL_NAMES[level]}</span>
                <span>{isMaxLevel ? 'Máximo' : LEVEL_NAMES[level + 1]}</span>
              </div>
              <div className="dashboard-progress-track" aria-label="Progresso de nível">
                <div
                  className="dashboard-progress-fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="dashboard-progress-foot">
                {isMaxLevel
                  ? 'Continue acumulando pontos para manter sua presença no ranking.'
                  : `Faltam ${formatNumber(remainingPoints)} pts para o próximo nível.`}
              </div>

              <div className="dashboard-journey-summary">
                <div className="dashboard-journey-summary-head">
                  <div className="dashboard-card-kicker">Atividade</div>
                  <div className="ih-section-title">Resumo do colaborador</div>
                </div>
                <div className="dashboard-journey-stat-grid">
                  {stats.map((stat, index) => (
                    <div
                      key={stat.label}
                      className="dashboard-journey-stat"
                      style={{
                        ...accentStyle(stat.color),
                        animation: `fadeUp ${0.06 + index * 0.05}s ease both`,
                      }}
                    >
                      <div className="dashboard-stat-icon">
                        <Icon name={stat.icon} size={15} />
                      </div>
                      <div className="stat-lbl">{stat.label}</div>
                      <div className="stat-num">
                        {dataLoading && stat.label !== 'Pontos acumulados'
                          ? '...'
                          : stat.value}
                      </div>
                      <div className="stat-sub">{stat.sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="dashboard-side-stack">
            <div className="card dashboard-mentor-card">
              <div className="card-p">
                <div className="dashboard-mini-head">
                  <div>
                    <div className="dashboard-card-kicker">Mentorias</div>
                    <div className="ih-section-title">Resumo da jornada</div>
                  </div>
                  {mentorshipSummary?.candidateProfile && (
                    <span
                      className={`dashboard-pill${
                        mentorshipSummary.candidateProfile.status === 'active' ? ' is-active' : ' is-pending'
                      }`}
                    >
                      {mentorshipSummary.candidateProfile.status === 'active' ? 'Mentor ativo' : 'Candidatura pendente'}
                    </span>
                  )}
                </div>
                <div className="dashboard-mini-grid">
                  <div>
                    <strong>{dataLoading ? '...' : mentorshipSummary?.active ?? 0}</strong>
                    <span>Ativas</span>
                  </div>
                  <div>
                    <strong>{dataLoading ? '...' : mentorshipSummary?.pending ?? 0}</strong>
                    <span>Pendentes</span>
                  </div>
                  <div>
                    <strong>{dataLoading ? '...' : mentorshipSummary?.history ?? 0}</strong>
                    <span>Histórico</span>
                  </div>
                </div>
                <div className="dashboard-mentor-copy">
                  {mentorshipSummary?.pendingForMe
                    ? `${mentorshipSummary.pendingForMe} solicitação(ões) aguardando sua avaliação.`
                    : mentorshipSummary?.activeAsMentor
                    ? `${mentorshipSummary.activeAsMentor} mentoria(s) ativa(s) conduzida(s) por você.`
                    : mentorshipSummary?.activeAsMentee
                    ? `${mentorshipSummary.activeAsMentee} mentoria(s) ativa(s) como mentorado.`
                    : 'Acompanhe solicitações, mentorias ativas e histórico em um só lugar.'}
                </div>
                <div className="dashboard-card-actions">
                  <Link className="btn btn-muted btn-sm" href="/mentorships?view=mentee" prefetch={false}>
                    Minhas mentorias
                  </Link>
                  <Link className="btn btn-accent btn-sm" href="/mentorships?view=discover" prefetch={false}>
                    Explorar
                  </Link>
                </div>
              </div>
            </div>

            <div className="dashboard-rank-grid">
              {rankingCards.map((item) => (
                <Link className="dashboard-rank-card" href={item.href} key={item.label} prefetch>
                  <Icon name={item.icon} size={18} />
                  <strong>{dataLoading ? '...' : item.value}</strong>
                  <span>{item.label}</span>
                  <small>{item.sub}</small>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="dashboard-lower-grid">
          <div className="card dashboard-recent-ideas-card">
            <div className="ih-section-head">
              <div className="ih-section-title">Ideias recentes do setor</div>
              <Link href="/hub" className="btn btn-sm btn-muted" style={{ textDecoration: 'none' }} prefetch>
                <Icon name="layers" size={13} />
                Abrir Hub
              </Link>
            </div>
            <div className="ih-list">
              {(dashboard?.recentIdeas ?? []).map((idea) => {
                const statusMeta = STATUS_LABELS[idea.status]
                return (
                  <Link
                    className="ih-list-row"
                    key={idea.id}
                    href={`/hub?idea=${idea.id}`}
                    style={{ color: 'inherit', textDecoration: 'none' }}
                  >
                    <div
                      className="dashboard-status-dot"
                      style={statusStyle(statusMeta?.color ?? '#0057A8')}
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ color: 'var(--ink)', fontSize: 12.5, fontWeight: 700, lineHeight: 1.4 }}>
                        {idea.title}
                      </div>
                      <div style={{ color: 'var(--ink-3)', fontSize: 10.5, marginTop: 2 }}>
                        {statusMeta?.label ?? idea.status} · Score {idea.ai_score}
                      </div>
                    </div>
                  </Link>
                )
              })}
              {!dataLoading && (dashboard?.recentIdeas.length ?? 0) === 0 && (
                <div className="ih-list-row" style={{ color: 'var(--ink-3)', fontSize: 12 }}>
                  Nenhuma ideia recente encontrada.
                </div>
              )}
            </div>
          </div>

          <div className="card dashboard-sector-ranking-card">
            <div className="ih-section-head">
              <div>
                <div className="ih-section-title">
                  Top 5 - {sectorName || 'Seu setor'}
                </div>
                <div className="ih-topbar-sub" style={{ marginTop: 2 }}>Ranking do departamento</div>
              </div>
              <Link
                href="/leaderboard"
                className="btn btn-sm btn-muted"
                style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}
                prefetch
              >
                <Icon name="award" size={13} />
                Ver completo
              </Link>
            </div>
            <div className="ih-list">
              {(dashboard?.topUsers ?? []).map((person, index) => {
                const isFirst = index === 0
                return (
                  <div className="ih-list-row" key={person.id}>
                    <div className={`dashboard-rank-index${isFirst ? ' is-first' : ''}`}>
                      #{index + 1}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ color: 'var(--ink)', fontSize: 12.5, fontWeight: 800, lineHeight: 1.35 }}>
                        {person.name}
                      </div>
                      <div style={{ color: 'var(--ink-3)', fontSize: 10.5, marginTop: 1 }}>
                        Nível {person.level} · {(person.points ?? 0).toLocaleString('pt-BR')} pts
                      </div>
                    </div>
                    {isFirst && (
                      <Icon name="award" size={16} className="dashboard-rank-award" />
                    )}
                  </div>
                )
              })}
              {!dataLoading && (dashboard?.topUsers.length ?? 0) === 0 && (
                <div className="ih-list-row" style={{ color: 'var(--ink-3)', fontSize: 12 }}>
                  Nenhum usuário visível no ranking.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </ProfileShell>
  )
}
