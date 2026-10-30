'use client'

import { useSyncExternalStore } from 'react'
import { useUser } from '@/hooks/useUser'
import Icon from '@/components/shared/Icon'
import ProfileShell from '@/components/shared/ProfileShell'

function subscribeTheme(cb: () => void) {
  window.addEventListener('ih:theme', cb)
  return () => window.removeEventListener('ih:theme', cb)
}
function getThemeSnapshot() {
  return typeof window !== 'undefined' && localStorage.getItem('ih-dark-mode') === 'true'
}

export default function ManagerProfilePage() {
  const { user, loading } = useUser()
  const isDark = useSyncExternalStore(subscribeTheme, getThemeSnapshot, () => false)

  if (loading) return <p className="ih-loading-page">Carregando...</p>

  const accent    = isDark ? '#D4A000' : '#1d4ed8'
  const accentBg  = isDark ? 'rgba(212,160,0,.14)' : 'rgba(29,78,216,.1)'
  const initials  = (user?.name ?? 'GE')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')

  return (
    <ProfileShell
      profile="gestor"
      title="Meu Perfil"
      subtitle="Informações da sua conta"
      user={user}
      pageBodyClass="light-page"
    >
      <div className="ih-dashboard-stack">

        {/* Identity card */}
        <div className="card">
          <div className="card-p" style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: accent,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: '#fff',
                fontSize: 22,
                fontWeight: 900,
              }}
            >
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--ink)', lineHeight: 1.3 }}>
                {user?.name ?? '—'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>
                {user?.email ?? '—'}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '3px 10px',
                    borderRadius: 999,
                    background: accentBg,
                    color: accent,
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  <Icon name="building" size={11} />
                  Gestor
                </span>
                {user?.sector_name && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '3px 10px',
                      borderRadius: 999,
                      background: 'var(--surface-2)',
                      color: 'var(--ink-2)',
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    <Icon name="layers" size={11} />
                    {user.sector_name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Info grid */}
        <div className="card">
          <div className="card-p">
            <div className="ih-section-title" style={{ marginBottom: 16 }}>Detalhes da conta</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { icon: 'user' as const,   label: 'Nome',   value: user?.name ?? '—' },
                { icon: 'mail' as const,   label: 'E-mail', value: user?.email ?? '—' },
                { icon: 'layers' as const, label: 'Setor',  value: user?.sector_name ?? '—' },
                { icon: 'shield' as const, label: 'Perfil', value: 'Gestor' },
              ].map(({ icon, label, value }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      background: 'var(--surface-2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon name={icon} size={15} style={{ color: 'var(--ink-3)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {label}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {value}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </ProfileShell>
  )
}
