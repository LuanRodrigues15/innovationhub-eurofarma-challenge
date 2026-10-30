'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { useUser } from '@/hooks/useUser'
import ProfileShell from '@/components/shared/ProfileShell'
import Icon from '@/components/shared/Icon'
import { fetchManagerMetrics, type ManagerMetricsData } from '@/services/managementService'
import { getImprovementAreaLabel } from '@/components/shared/IdeaCard'
import type { ImprovementArea } from '@/services/ideasService'

// ── Dark-mode store ────────────────────────────────────────────────────────────
function subscribeDarkMode(cb: () => void) {
  window.addEventListener('ih:theme', cb)
  return () => window.removeEventListener('ih:theme', cb)
}
function getDarkModeSnapshot() {
  return localStorage.getItem('ih-dark-mode') === 'true'
}

// ── Theme ──────────────────────────────────────────────────────────────────────
type Theme = {
  pageBg: string; cardBg: string; cardShadow: string
  textPrimary: string; textSecondary: string; textMuted: string; divider: string
  sheetBorder: string; inputBg: string
}

const LIGHT: Theme = {
  pageBg: '#FDFAF4', cardBg: 'white',
  cardShadow: '0 2px 10px rgba(0,0,0,.07)',
  textPrimary: '#1e293b', textSecondary: '#64748b', textMuted: '#94a3b8', divider: '#e2e8f0',
  sheetBorder: '1px solid #e2e8f0', inputBg: '#f8fafc',
}
const DARK: Theme = {
  pageBg: '#0B1733', cardBg: '#0E1C3D',
  cardShadow: '0 2px 10px rgba(0,0,0,.4)',
  textPrimary: 'rgba(255,255,255,0.92)', textSecondary: 'rgba(255,255,255,0.65)', textMuted: 'rgba(255,255,255,0.38)', divider: 'rgba(255,255,255,0.08)',
  sheetBorder: '1px solid rgba(255,255,255,0.08)', inputBg: 'rgba(255,255,255,0.04)',
}

const BLUE = '#0057A8'

function formatDate(value: string) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function authorInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ManagerMetricsPage() {
  const { user, loading: userLoading } = useUser()
  const isDark = useSyncExternalStore(subscribeDarkMode, getDarkModeSnapshot, () => false)
  const th = isDark ? DARK : LIGHT
  const accent = isDark ? '#FFC600' : BLUE

  const [data, setData] = useState<ManagerMetricsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (userLoading || !user) return
    setLoading(true)
    fetchManagerMetrics(user.sector_id ?? null)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro ao carregar métricas'))
      .finally(() => setLoading(false))
  }, [user, userLoading])

  if (userLoading) return <p className="ih-loading-page">Carregando...</p>

  const maxMonthCount = data ? Math.max(...data.monthlyTrend.map((m) => m.count), 1) : 1

  return (
    <ProfileShell
      profile="gestor"
      title="Métricas do Setor"
      subtitle="Acompanhe o desempenho das ideias, contribuidores e tendências"
      user={user}
      pageBodyClass="light-page"
      notifCount={3}
    >
      <div className="ih-dashboard-stack employee-dashboard-page">

          {error && (
            <div className="ih-feedback ih-feedback-error">{error}</div>
          )}

          {loading ? (
            <p className="ih-loading-page" style={{ minHeight: 320 }}>Carregando métricas...</p>
          ) : data ? (
            <>
              {/* ── KPI Row ── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                <KpiCard
                  label="Total de Ideias"
                  value={data.totalIdeas}
                  icon="layers"
                  color={accent}
                  isDark={isDark}
                  th={th}
                  tooltip="Total de ideias no seu setor"
                />
                <KpiCard
                  label="Aguardando Análise"
                  value={data.awaitingAnalysis}
                  icon="clock"
                  color="#f59e0b"
                  isDark={isDark}
                  th={th}
                  tooltip="Ideias em status 'Em análise' aguardando decisão"
                />
                <KpiCard
                  label="Taxa de Aprovação"
                  value={`${data.conversionRate}%`}
                  icon="trending-up"
                  color="#22c55e"
                  isDark={isDark}
                  th={th}
                  tooltip="Percentual de ideias analisadas que foram aprovadas ou geraram valor"
                />
                <KpiCard
                  label="Geraram Valor"
                  value={data.gerouValor}
                  icon="sparkles"
                  color={isDark ? '#FFC600' : '#d97706'}
                  isDark={isDark}
                  th={th}
                  tooltip="Ideias que chegaram ao status 'Gerou Valor' (conhecimento organizacional)"
                  tooltipEnd
                />
              </div>

              {/* ── Pipeline + Área ── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>

                {/* Pipeline de status */}
                <div className="card"><div className="card-p">
                  <SectionTitle label="Pipeline de Status" icon="layers" accent={accent} th={th} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 18 }}>
                    {data.statusCounts.map((s) => {
                      const pct = data.totalIdeas > 0 ? Math.round((s.count / data.totalIdeas) * 100) : 0
                      return (
                        <div key={s.status}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0, display: 'inline-block' }} />
                              <span style={{ fontSize: 13, fontWeight: 600, color: th.textPrimary }}>{s.label}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ fontSize: 11, color: th.textMuted, fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
                              <span style={{ fontSize: 15, fontWeight: 800, color: s.color, minWidth: 24, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{s.count}</span>
                            </div>
                          </div>
                          <div style={{ height: 7, borderRadius: 100, background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9', overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: 100, background: s.color, width: `${pct}%`, minWidth: s.count > 0 ? 12 : 0, transition: 'width .4s ease' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div></div>

                {/* Distribuição por área */}
                <div className="card"><div className="card-p">
                  <SectionTitle label="Por Área de Melhoria" icon="bar-chart" accent={accent} th={th} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 18 }}>
                    {data.areaCounts.map((a) => (
                      <div key={a.area}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: a.color, flexShrink: 0, display: 'inline-block' }} />
                            <span style={{ fontSize: 13, fontWeight: 600, color: th.textPrimary }}>{a.label}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            {a.count > 0 && (
                              <>
                                <span style={{ fontSize: 10, fontWeight: 700, color: th.textMuted }}>
                                  IA: <span style={{ color: a.color }}>{a.avgAiScore}</span>
                                </span>
                                <span style={{ fontSize: 10, fontWeight: 700, color: th.textMuted }}>
                                  Social: <span style={{ color: a.color }}>{a.avgSocialScore}</span>
                                </span>
                              </>
                            )}
                            <span style={{ fontSize: 15, fontWeight: 800, color: a.color, minWidth: 22, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{a.count}</span>
                          </div>
                        </div>
                        <div style={{ height: 7, borderRadius: 100, background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9', overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 100, background: a.color, width: `${a.pct}%`, minWidth: a.count > 0 ? 12 : 0, transition: 'width .4s ease' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div></div>
              </div>

              {/* ── Tendência Mensal + Top Contribuidores ── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18 }}>

                {/* Tendência mensal */}
                <div className="card"><div className="card-p">
                  <SectionTitle label="Tendência de Submissões" icon="trending-up" accent={accent} th={th} subtitle="Últimos 6 meses" />
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 130, marginTop: 24 }}>
                    {data.monthlyTrend.map((m) => {
                      const heightPct = maxMonthCount > 0 ? Math.max(4, Math.round((m.count / maxMonthCount) * 100)) : 4
                      return (
                        <div key={m.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: m.count > 0 ? accent : th.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                            {m.count > 0 ? m.count : ''}
                          </span>
                          <div style={{ width: '100%', borderRadius: 6, background: accent, opacity: m.count > 0 ? 1 : 0.18, height: `${heightPct}%`, transition: 'height .4s ease', minHeight: 6 }} />
                          <span style={{ fontSize: 11, fontWeight: 600, color: th.textMuted, textTransform: 'capitalize' }}>{m.label}</span>
                        </div>
                      )
                    })}
                  </div>
                </div></div>

                {/* Top contribuidores */}
                <div className="card"><div className="card-p">
                  <SectionTitle label="Top Contribuidores" icon="award" accent={accent} th={th} subtitle="Por número de ideias" />
                  {data.topContributors.length === 0 ? (
                    <p style={{ fontSize: 13, color: th.textMuted, marginTop: 18 }}>Nenhum contribuidor encontrado.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginTop: 14 }}>
                      {data.topContributors.map((c, idx) => (
                        <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: idx < data.topContributors.length - 1 ? `1px solid ${th.divider}` : 'none' }}>
                          <span style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, background: idx === 0 ? (isDark ? 'rgba(255,198,0,0.18)' : 'rgba(0,87,168,0.10)') : (isDark ? 'rgba(255,255,255,0.07)' : '#f1f5f9'), color: idx === 0 ? accent : th.textMuted, fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {idx + 1}
                          </span>
                          <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: '#1d4ed8', color: 'white', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {authorInitials(c.name)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: th.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                            <div style={{ fontSize: 11, color: th.textMuted }}>
                              {c.approvedCount > 0 && <span style={{ color: '#22c55e', fontWeight: 600 }}>{c.approvedCount} aprovada{c.approvedCount !== 1 ? 's' : ''} · </span>}
                              {c.points.toLocaleString('pt-BR')} pts
                            </div>
                          </div>
                          <span style={{ flexShrink: 0, fontSize: 13, fontWeight: 800, color: accent, fontVariantNumeric: 'tabular-nums' }}>
                            {c.ideaCount}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div></div>
              </div>

              {/* ── Cases de Sucesso ── */}
              {data.successCases.length > 0 && (
                <div className="card"><div className="card-p">
                  <SectionTitle label="Cases de Sucesso" icon="sparkles" accent={accent} th={th} subtitle="Ideias que geraram valor real para a empresa" />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginTop: 18 }}>
                    {data.successCases.map((idea) => (
                      <SuccessCaseCard key={idea.id} idea={idea} isDark={isDark} th={th} accent={accent} />
                    ))}
                  </div>
                </div></div>
              )}

              {data.successCases.length === 0 && (
                <div className="card"><div className="card-p" style={{ textAlign: 'center' }}>
                  <SectionTitle label="Cases de Sucesso" icon="sparkles" accent={accent} th={th} />
                  <p style={{ marginTop: 18, fontSize: 14, color: th.textMuted, lineHeight: 1.6 }}>
                    Nenhuma ideia chegou ao status <strong>Gerou Valor</strong> ainda.<br />
                    Aprove e acompanhe as ideias em implantação para criar seus primeiros cases.
                  </p>
                </div></div>
              )}
            </>
          ) : null}
      </div>
    </ProfileShell>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, icon, color, isDark, th, tooltip, tooltipEnd,
}: {
  label: string
  value: number | string
  icon: Parameters<typeof Icon>[0]['name']
  color: string
  isDark: boolean
  th: Theme
  tooltip?: string
  tooltipEnd?: boolean
}) {
  return (
    <div
      className={tooltip ? `ih-status-chip${tooltipEnd ? ' tooltip-end' : ''}` : undefined}
      data-label={tooltip}
      style={{
        background: th.cardBg,
        borderRadius: 16,
        padding: '18px 20px',
        boxShadow: th.cardShadow,
        display: 'flex', alignItems: 'flex-start', gap: 14,
        border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #f1f5f9',
      }}
    >
      <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: `${color}1a`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={17} />
      </div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, color: th.textMuted, letterSpacing: '.04em', textTransform: 'uppercase', lineHeight: 1.2, marginBottom: 6 }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 900, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      </div>
    </div>
  )
}

// ── Section Title ─────────────────────────────────────────────────────────────
function SectionTitle({
  label, icon, accent, th, subtitle,
}: {
  label: string
  icon: Parameters<typeof Icon>[0]['name']
  accent: string
  th: Theme
  subtitle?: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: `${accent}18`, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon name={icon} size={14} />
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 800, color: th.textPrimary, lineHeight: 1.2 }}>{label}</div>
        {subtitle && <div style={{ fontSize: 11, color: th.textMuted, marginTop: 1 }}>{subtitle}</div>}
      </div>
    </div>
  )
}

// ── Success Case Card ─────────────────────────────────────────────────────────
function SuccessCaseCard({
  idea, isDark, th, accent,
}: {
  idea: ManagerMetricsData['successCases'][number]
  isDark: boolean
  th: Theme
  accent: string
}) {
  return (
    <div style={{
      borderRadius: 14,
      overflow: 'hidden',
      border: isDark ? '1px solid rgba(255,198,0,0.14)' : '1px solid rgba(0,87,168,0.10)',
      background: isDark ? 'rgba(255,198,0,0.03)' : 'rgba(0,87,168,0.02)',
    }}>
      {/* Gold bar */}
      <div style={{ height: 4, background: `linear-gradient(90deg, ${accent}, ${isDark ? '#D4A000' : '#0057A8'})` }} />
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ padding: '2px 8px', borderRadius: 100, fontSize: 9, fontWeight: 800, background: isDark ? 'rgba(255,198,0,0.18)' : 'rgba(0,87,168,0.10)', color: accent, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            Gerou Valor
          </span>
          <span style={{ fontSize: 11, color: th.textMuted, marginLeft: 'auto' }}>
            {getImprovementAreaLabel(idea.improvement_area as ImprovementArea)}
          </span>
        </div>
        <h4 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 800, color: th.textPrimary, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {idea.title}
        </h4>
        {idea.summary && (
          <p style={{ margin: '0 0 12px', fontSize: 12, color: th.textSecondary, lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {idea.summary}
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#1d4ed8', color: 'white', fontSize: 8, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {idea.author_name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')}
            </div>
            <span style={{ fontSize: 11, color: th.textSecondary, fontWeight: 600 }}>{idea.author_name.split(' ')[0]}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, color: th.textMuted }}>{formatDate(idea.updated_at)}</span>
            <span style={{ fontSize: 11, fontWeight: 800, background: isDark ? 'rgba(255,198,0,0.15)' : 'rgba(0,87,168,0.10)', color: accent, padding: '2px 7px', borderRadius: 6, fontVariantNumeric: 'tabular-nums' }}>
              IA {idea.ai_score}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
