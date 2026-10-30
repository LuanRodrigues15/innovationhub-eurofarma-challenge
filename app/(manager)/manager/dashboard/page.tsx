'use client'

import { useEffect, useState, useSyncExternalStore, type CSSProperties } from 'react'
import Link from 'next/link'
import { useUser } from '@/hooks/useUser'
import Icon, { type IconName } from '@/components/shared/Icon'
import ProfileShell from '@/components/shared/ProfileShell'
import { fetchManagerDashboardData, type ManagerDashboardData } from '@/services/managementService'

function subscribeDarkMode(cb: () => void) {
  window.addEventListener('ih:theme', cb)
  return () => window.removeEventListener('ih:theme', cb)
}
function getDarkModeSnapshot() {
  return localStorage.getItem('ih-dark-mode') === 'true'
}

function fmt(n: number) {
  return n.toLocaleString('pt-BR')
}

function tabColor(color: string) {
  return { '--mgr-tab-color': color } as CSSProperties
}

type TabCard = {
  label: string
  value: string
  sub: string
  detail: string
  icon: IconName
  href: string
  color: string
}

export default function ManagerDashboardPage() {
  const { user, loading: userLoading } = useUser()
  const isDark = useSyncExternalStore(subscribeDarkMode, getDarkModeSnapshot, () => false)

  const [dashboard, setDashboard] = useState<ManagerDashboardData | null>(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchManagerDashboardData(user?.sector_id)
        if (active) setDashboard(data)
      } catch {
        if (active) setError('Erro ao carregar dashboard.')
      } finally {
        if (active) setLoading(false)
      }
    }
    if (user?.id) load()
    return () => { active = false }
  }, [user?.id, user?.sector_id])

  if (userLoading) return <p className="ih-loading-page">Carregando...</p>

  const accent         = isDark ? '#FFC600' : '#1d4ed8'
  const awaiting       = dashboard?.awaitingAnalysis ?? 0
  const awaitingColor  = awaiting > 0 ? '#f59e0b' : '#22c55e'
  const totalSugestoes = dashboard?.pipelineCounts?.find((p) => p.status === 'sugestao')?.count ?? 0
  const pendingMentors = dashboard?.pendingMentors ?? 0
  const maxPipeline    = Math.max(...(dashboard?.pipelineCounts ?? []).map((p) => p.count), 1)

  const tabCards: TabCard[] = [
    {
      label:  'Triagem de Ideias',
      value:  loading ? '—' : fmt(awaiting),
      sub:    awaiting === 1 ? 'ideia em análise' : 'ideias em análise',
      detail: `${fmt(dashboard?.approvedThisMonth ?? 0)} aprovação${(dashboard?.approvedThisMonth ?? 0) !== 1 ? 'ões' : ''} este mês`,
      icon:   'layers',
      href:   '/manager/dashboard/hub',
      color:  '#f59e0b',
    },
    {
      label:  'Hub de Ideias',
      value:  loading ? '—' : fmt(totalSugestoes),
      sub:    totalSugestoes === 1 ? 'nova sugestão' : 'novas sugestões',
      detail: `${fmt(dashboard?.totalIdeas ?? 0)} ideia${(dashboard?.totalIdeas ?? 0) !== 1 ? 's' : ''} no setor ao total`,
      icon:   'lightbulb',
      href:   '/hub',
      color:  accent,
    },
    {
      label:  'Métricas',
      value:  loading ? '—' : `${dashboard?.conversionRate ?? 0}%`,
      sub:    'taxa de aprovação',
      detail: `score médio de IA: ${loading ? '—' : (dashboard?.averageAiScore ?? 0)} pts`,
      icon:   'bar-chart',
      href:   '/manager/metrics',
      color:  '#22c55e',
    },
    {
      label:  'Mentorias',
      value:  loading ? '—' : fmt(pendingMentors),
      sub:    pendingMentors === 1 ? 'candidatura pendente' : 'candidaturas pendentes',
      detail: 'Ver todas as mentorias do setor',
      icon:   'users',
      href:   '/manager/mentorships',
      color:  '#7c3aed',
    },
  ]

  return (
    <ProfileShell
      profile="gestor"
      title="Visão Geral"
      subtitle={`Setor ${user?.sector_name ?? '—'}`}
      user={user}
      notifCount={pendingMentors}
      pageBodyClass="light-page"
    >
      <div className="ih-dashboard-stack employee-dashboard-page">
        {error && <div className="dashboard-alert">{error}</div>}

        {/* ── Hero ── */}
        <div className="card dashboard-level-card">
          <div className="card-p" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 32, flexWrap: 'wrap' }}>

            {/* Number + label */}
            <div>
              <div className="dashboard-card-kicker">Setor {user?.sector_name ?? '—'}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
                <span style={{
                  fontSize: 52, fontWeight: 900, lineHeight: 1,
                  color: awaitingColor, fontVariantNumeric: 'tabular-nums',
                  transition: 'color .3s ease',
                }}>
                  {loading ? '—' : fmt(awaiting)}
                </span>
                <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink-2)' }}>
                  ideia{awaiting !== 1 ? 's' : ''} aguardando análise
                </span>
              </div>
              <p style={{ marginTop: 8, color: 'var(--ink-3)', fontSize: 13, lineHeight: 1.5, maxWidth: 520 }}>
                {awaiting > 0
                  ? `Sua decisão é necessária para que essas ideia${awaiting !== 1 ? 's' : ''} avancem no pipeline do setor.`
                  : 'Nenhuma ideia aguardando análise. O pipeline do setor está em dia.'}
              </p>
            </div>

            {/* CTA + badge */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12, flexShrink: 0 }}>
              <Link className="btn btn-accent" href="/manager/dashboard/hub" prefetch style={{ fontSize: 15, padding: '12px 28px', gap: 10 }}>
                <Icon name="layers" size={17} />
                Triar ideias
              </Link>
              {(dashboard?.approvedThisMonth ?? 0) > 0 && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 13px', borderRadius: 99,
                  background: 'color-mix(in srgb, #22c55e 10%, transparent)',
                  border: '1px solid color-mix(in srgb, #22c55e 22%, transparent)',
                  color: '#16a34a', fontSize: 12, fontWeight: 800,
                }}>
                  <Icon name="check-circle" size={13} />
                  {dashboard!.approvedThisMonth} aprovação{dashboard!.approvedThisMonth !== 1 ? 'ões' : ''} este mês
                </span>
              )}
            </div>

          </div>
        </div>

        {/* ── 4 tab cards ── */}
        <div className="mgr-tab-grid">
          {tabCards.map((tab) => (
            <Link
              key={tab.label}
              href={tab.href}
              className="card mgr-tab-card"
              prefetch
              style={tabColor(tab.color)}
            >
              {/* Icon + kicker */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: `color-mix(in srgb, ${tab.color} 13%, transparent)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: tab.color,
                }}>
                  <Icon name={tab.icon} size={16} />
                </span>
                <span style={{
                  fontSize: 10.5, fontWeight: 900, color: 'var(--ink-3)',
                  textTransform: 'uppercase', letterSpacing: '0.07em', lineHeight: 1.3,
                }}>
                  {tab.label}
                </span>
              </div>

              {/* Value */}
              <div style={{
                fontSize: 40, fontWeight: 900, lineHeight: 1,
                color: tab.color, fontVariantNumeric: 'tabular-nums',
              }}>
                {tab.value}
              </div>

              {/* Sub */}
              <div style={{ fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 700 }}>
                {tab.sub}
              </div>

              {/* Detail + arrow */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 8, marginTop: 'auto', paddingTop: 12,
                borderTop: '1px solid var(--line)',
              }}>
                <span style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, lineHeight: 1.4 }}>
                  {tab.detail}
                </span>
                <span style={{
                  width: 24, height: 24, borderRadius: 7, flexShrink: 0,
                  background: `color-mix(in srgb, ${tab.color} 12%, transparent)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: tab.color,
                }}>
                  <Icon name="chevron-right" size={12} />
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* ── Pipeline card ── */}
        <div className="card">
          <div className="card-p">
            <div className="ih-section-head" style={{ paddingBottom: 16 }}>
              <div>
                <div className="dashboard-card-kicker" style={{ marginBottom: 3 }}>Pipeline</div>
                <div className="ih-section-title">Funil do setor</div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink-3)' }}>
                {loading ? '—' : `${fmt(dashboard?.totalIdeas ?? 0)} total`}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 160 }}>
              {(dashboard?.pipelineCounts ?? []).map((stage) => {
                const pct = Math.max(4, Math.round((stage.count / maxPipeline) * 100))
                return (
                  <div key={stage.status} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, height: '100%', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: 15, fontWeight: 900, color: stage.color, fontVariantNumeric: 'tabular-nums' }}>
                      {loading ? '·' : stage.count}
                    </span>
                    <div style={{ width: '100%', borderRadius: '6px 6px 0 0', background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9', overflow: 'hidden', height: '100%', display: 'flex', alignItems: 'flex-end' }}>
                      <div style={{
                        width: '100%',
                        height: loading ? '0%' : `${pct}%`,
                        background: stage.color,
                        borderRadius: '6px 6px 0 0',
                        transition: 'height .55s ease',
                        opacity: 0.85,
                      }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: stage.color, display: 'inline-block' }} />
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ink-3)', textAlign: 'center', lineHeight: 1.3 }}>{stage.label}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

      </div>
    </ProfileShell>
  )
}
