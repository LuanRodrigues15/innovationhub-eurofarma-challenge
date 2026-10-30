'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import Icon from '@/components/shared/Icon'
import ProfileShell from '@/components/shared/ProfileShell'
import {
  fetchAdminDashboardData,
  type AdminDashboardData,
} from '@/services/managementService'

function accentStyle(color: string) {
  return { '--accent-color': color } as CSSProperties
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function AdminDashboardPage() {
  const { user, loading: userLoading } = useUser()
  const router = useRouter()
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadDashboard() {
      setLoading(true)
      setError(null)

      try {
        const data = await fetchAdminDashboardData()
        if (active) setDashboard(data)
      } catch {
        if (active) setError('Erro ao carregar painel administrativo.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadDashboard()

    return () => {
      active = false
    }
  }, [])

  if (userLoading) return <p className="ih-loading-page">Carregando...</p>

  const stats = [
    {
      label: 'Usuários ativos',
      value: String(dashboard?.totalUsers ?? 0),
      sub: 'Perfis cadastrados',
      color: '#0057a8',
    },
    {
      label: 'Ideias registradas',
      value: String(dashboard?.totalIdeas ?? 0),
      sub: 'Total na plataforma',
      color: '#4f46e5',
    },
    {
      label: 'Alertas pendentes',
      value: String(dashboard?.pendingAlerts ?? 0),
      sub: 'Moderação ativa',
      color: '#c53030',
    },
    {
      label: 'Pontos distribuídos',
      value: (dashboard?.pointsDistributed ?? 0).toLocaleString('pt-BR'),
      sub: 'Últimas transações',
      color: '#d97706',
    },
  ]

  return (
    <ProfileShell
      profile="admin"
      title="Painel Geral"
      subtitle="Gestão da plataforma, usuários e parâmetros de inovação"
      user={user}
      notifCount={dashboard?.pendingAlerts ?? 0}
    >
      <div className="admin-dashboard-page ih-dashboard-stack">
        {error && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              background: 'rgba(229,62,62,.08)',
              color: 'var(--danger)',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {error}
          </div>
        )}

        <section className="ih-stats-grid">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className="stat-block"
              style={{
                ...accentStyle(stat.color),
                animation: `fadeUp ${0.08 + index * 0.06}s ease both`,
              }}
            >
              <div className="stat-lbl">{stat.label}</div>
              <div className="stat-num" style={{ color: stat.color }}>
                {loading ? '...' : stat.value}
              </div>
              <div className="stat-sub">{stat.sub}</div>
            </div>
          ))}
        </section>

        <section className="ih-equal-col">
          <div className="card">
            <div className="ih-section-head">
              <div className="ih-section-title">Status das ideias</div>
              <Link href="/manager/dashboard/hub" className="tag" style={{ textDecoration: 'none' }}>
                Hub
              </Link>
            </div>
            {(dashboard?.statusCounts ?? []).map((item) => (
              <div className="ih-list-row" key={item.status}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                    <span style={{ color: 'var(--ink)', fontSize: 13 }}>{item.label}</span>
                    <span className="tabnum" style={{ color: item.color, fontWeight: 800 }}>
                      {item.count}
                    </span>
                  </div>
                  <div className="track">
                    <div className="fill" style={{ width: `${item.pct}%`, background: item.color }} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="ih-section-head">
              <div className="ih-section-title">Ações administrativas</div>
            </div>
            <div className="card-p ih-quick-grid">
              <AdminAction href="/admin/users" icon="users" title="Usuários" desc="CRUD de perfis e mentores" />
              <AdminAction href="/admin/settings" icon="settings" title="Configurações" desc="Pontuação e regras" />
              <AdminAction href="/admin/content" icon="layers" title="Conteúdo" desc="Cursos, quizzes e setores" />
              <AdminAction href="/admin/moderation" icon="shield" title="Moderação" desc="Alertas e status" />
            </div>
          </div>

          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <div className="ih-section-head">
              <div className="ih-section-title">Log de pontos recentes</div>
              <span className="tag">Últimas transações</span>
            </div>
            <div className="ih-list">
              {(dashboard?.recentLedger ?? []).map((log) => (
                <div
                  key={log.id}
                  className="ih-list-row"
                  role="button"
                  tabIndex={0}
                  style={{ cursor: 'pointer' }}
                  onClick={() => router.push(`/admin/users?openUser=${log.user_id}&tab=logs`)}
                  onKeyDown={(e) => e.key === 'Enter' && router.push(`/admin/users?openUser=${log.user_id}&tab=logs`)}
                >
                  <span style={{ color: 'var(--ink-3)', width: 98, fontSize: 11 }}>
                    {formatDate(log.created_at)}
                  </span>
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      marginTop: 7,
                      borderRadius: 99,
                      background: log.points >= 0 ? 'var(--green)' : 'var(--danger)',
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ color: 'var(--ink)', fontSize: 13, flex: 1 }}>
                    {log.label} · {log.user_name}
                  </span>
                  <span className="tabnum" style={{ color: log.points >= 0 ? 'var(--green)' : 'var(--danger)', fontWeight: 800 }}>
                    {log.points > 0 ? '+' : ''}{log.points}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </ProfileShell>
  )
}

function AdminAction({
  href,
  icon,
  title,
  desc,
}: {
  href: string
  icon: 'users' | 'settings' | 'layers' | 'shield'
  title: string
  desc: string
}) {
  return (
    <Link className="ih-action-card" href={href} prefetch>
      <div className="ih-action-icon">
        <Icon name={icon} size={15} />
      </div>
      <div className="ih-action-title">{title}</div>
      <div className="ih-action-desc">{desc}</div>
    </Link>
  )
}
