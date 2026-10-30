'use client'

import { useRouter } from 'next/navigation'
import { clearUserCache, useUser } from '@/hooks/useUser'
import { signOut } from '@/services/auth.service'
import Icon, { type IconName } from '@/components/shared/Icon'
import EurofarmaLogo from '@/components/shared/EurofarmaLogo'

type TotemAction = {
  label: string
  icon: IconName
  href?: string
  muted?: boolean
  onClick?: () => void
}

export default function TotemDashboardPage() {
  const router = useRouter()
  const { user, loading } = useUser()

  if (loading) return <p className="ih-loading-page">Carregando...</p>

  async function handleExit() {
    clearUserCache()
    await signOut()
    router.push('/totem-login')
  }

  const actions: TotemAction[] = [
    { label: 'Nova Ideia', icon: 'plus', href: '/totem/ia-innovation' },
    { label: 'Ver Hub', icon: 'layers', href: '/totem/hub', muted: true },
    { label: 'Ranking', icon: 'award', href: '/totem/ranking', muted: true },
    { label: 'Recompensas', icon: 'gift', href: '/totem/marketplace', muted: true },
  ]

  return (
    <main className="ih-totem-wrap" style={{ overflowY: 'auto' }}>
      <div className="ih-totem-top">
        <div className="ih-brand-row">
          <EurofarmaLogo size={40} />
          <div>
            <div className="ih-brand-title">Innovation HUB</div>
            <div className="ih-brand-sub">EUROFARMA</div>
          </div>
        </div>
        <button
          className="btn totem-exit-btn"
          type="button"
          onClick={handleExit}
        >
          <Icon name="log-out" size={20} />
          Sair
        </button>
      </div>

      <section className="ih-totem-center" style={{ width: 'min(100%, 760px)' }}>
        <div className="ih-totem-symbol">
          <Icon name="lightbulb" size={36} />
        </div>
        <h1 className="ih-totem-title">Modo Totem</h1>
        <p className="ih-totem-text" style={{ marginBottom: 24 }}>
          Registre ideias, acompanhe o Hub e troque pontos por recompensas.
        </p>

        <div className="totem-actions-grid">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              className="totem-dashboard-action"
              onClick={() => {
                if (action.onClick) {
                  action.onClick()
                  return
                }
                if (action.href) router.push(action.href)
              }}
              style={{
                border: action.muted ? '1px solid rgba(255,255,255,.16)' : 'none',
                background: action.muted ? 'rgba(255,255,255,.1)' : 'var(--c-totem)',
                boxShadow: action.muted ? 'none' : '0 8px 32px rgba(2,132,199,.35)',
              }}
            >
              <Icon name={action.icon} size={24} />
              {action.label}
            </button>
          ))}
        </div>

        <div className="totem-metrics-grid">
          <Metric label="Saldo de pontos" value={`${(user?.points ?? 0).toLocaleString('pt-BR')} pts`} />
          <Metric label="Nível atual" value={`Nível ${user?.level ?? 1}`} />
        </div>
      </section>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="totem-dashboard-metric">
      <div className="totem-metric-label">{label}</div>
      <div className="tabnum totem-metric-value">{value}</div>
    </div>
  )
}
