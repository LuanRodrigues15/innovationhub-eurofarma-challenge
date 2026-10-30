'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Icon from '@/components/shared/Icon'
import type { IconName } from '@/components/shared/Icon'
import { clearUserCache } from '@/hooks/useUser'
import { loginAs, type PersonaId } from '@/lib/mock/session'

const PILLARS: { icon: IconName; label: string; desc: string }[] = [
  { icon: 'sparkles', label: 'Innovation IA', desc: 'Eura é a IA que transforma suas percepções em propostas estruturadas' },
  { icon: 'layers',   label: 'Hub de Ideias', desc: 'Acompanhe o desenvolvimento das ideias e contribua com a comunidade' },
  { icon: 'gift',     label: 'Marketplace',   desc: 'Pontos acumulados se transformam em benefícios reais e tangíveis' },
  { icon: 'cpu',      label: 'Academy',       desc: 'Cursos, quizzes e mentorias para gerar ideias de maior impacto' },
  { icon: 'users',    label: 'Mentorias',     desc: 'Conecte-se com mentores especializados da Eurofarma' },
]


const ROLE_OPTIONS: { id: PersonaId; label: string; icon: IconName }[] = [
  { id: 'funcionario', label: 'Funcionário', icon: 'user' },
  { id: 'gestor', label: 'Gestor', icon: 'users' },
  { id: 'admin', label: 'Administrador', icon: 'shield' },
  { id: 'totem', label: 'Totem', icon: 'kiosk' },
]

const CHAT_MESSAGES: { type: 'bot' | 'user'; text: string }[] = [
  { type: 'bot',  text: 'Sou a Eura, sua mentora de inovação. Me fala uma situação do seu trabalho que parece dar trabalho.' },
  { type: 'user', text: 'Como você transforma uma ideia em proposta?' },
  { type: 'bot',  text: 'Faço as perguntas certas, estruturo a proposta e calculo o AI Score antes de publicar no Hub.' },
  { type: 'bot',  text: 'Qualquer colaborador pode contribuir. Do escritório ao chão de fábrica.' },
]

function EuraAvatarLanding({ size = 32, dark = true }: { size?: number; dark?: boolean }) {
  const radius = Math.max(6, Math.round(size * 0.23))
  const innerSize = Math.round(size * 0.68)
  return (
    <div style={{
      width: size, height: size, borderRadius: radius,
      background: dark ? 'rgba(11,23,51,0.92)' : 'linear-gradient(145deg, #DCF0FF, #B8D0EC)',
      border: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,87,168,0.15)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', flexShrink: 0, overflow: 'hidden',
    }}>
      <span style={{ position: 'absolute', inset: 0, background: dark ? 'linear-gradient(145deg, rgba(255,255,255,.08), transparent 46%)' : 'linear-gradient(145deg, rgba(255,255,255,.5), transparent 46%)' }} />
      <span style={{ position: 'absolute', width: innerSize, height: innerSize, borderRadius: Math.max(5, Math.round(size * 0.18)), display: 'grid', placeItems: 'center', color: dark ? '#FFC600' : '#0057A8' }}>
        <Icon name="bot" size={Math.max(14, Math.round(size * 0.54))} />
      </span>
      <span style={{ position: 'absolute', left: Math.round(size * 0.17), top: Math.round(size * 0.16), width: Math.max(3, Math.round(size * 0.12)), height: Math.max(3, Math.round(size * 0.12)), borderRadius: 999, background: dark ? 'rgba(255,198,0,0.18)' : 'rgba(0,87,168,0.15)' }} />
    </div>
  )
}

function EurofarmaLogo({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 67.43 67.49" xmlns="http://www.w3.org/2000/svg">
      <path fill={color} d="M53.81,44.88c-3.72,0.22-8.13,0.8-12.89,1.74l-0.35-1.53c4.94-0.99,9.54-1.62,13.41-1.89c0.43-5,0.2-10.09-0.6-15.04c-4.72,0.17-10.29,0.84-16.25,2.03l-0.37-1.59c5.99-1.19,11.58-1.88,16.34-2.06c-1.02-5.44-2.7-10.37-4.82-14.5c-4.34,0.27-9.42,0.96-14.86,2.06l-0.37-1.58c5.29-1.06,10.2-1.74,14.39-2.02c-2.93-5.14-6.58-8.8-10.48-10.34c-3.54-0.34-7.18-0.15-10.84,0.69C15.52,3.3,7.28,10.51,3.07,19.69c4.24-3.85,13.65-7.99,25.02-10.62l0.03-0.01l2.31,10.02c-15.15,3.5-27.31,9.05-30.41,13.51c-0.08,2.49,0.11,5.02,0.6,7.57C3.1,36.24,15.7,29.18,31.89,25.45l0.01,0l2.19,9.48c-16.35,3.77-29.07,10.13-29.96,15c1.14,2.1,2.49,4.05,4.02,5.83c0.11-4.19,12.04-10.23,27.52-13.81l0.04-0.01l2.26,9.78l-0.02,0c-12.8,2.95-22.63,7.72-22.06,10.66c7.32,4.56,16.37,6.33,25.43,4.24c0.8-0.18,1.57-0.43,2.34-0.67C48.92,62.66,52.66,54.78,53.81,44.88"/>
      <path fill={color} d="M49.29,10.4c4.26-0.18,7.61,0.12,9.66,0.91c-5.03-5.65-11.87-9.5-19.37-10.83C43.18,2.17,46.55,5.64,49.29,10.4"/>
      <path fill={color} d="M67.29,30.61c-1.7-1.7-6.06-2.55-12.05-2.49c0.78,4.94,0.99,10.01,0.53,14.99c5.24-0.21,8.85,0.35,9.8,1.7C67.12,40.35,67.75,35.53,67.29,30.61"/>
      <path fill={color} d="M50.13,11.96c2.14,4.13,3.82,9.09,4.82,14.54c3.82-0.05,8.66,0.15,12.09,2.14c-0.13-0.84-0.25-1.67-0.44-2.51c-1.15-4.97-3.37-9.4-6.31-13.17C58.22,12.13,54.68,11.79,50.13,11.96"/>
      <path fill={color} d="M55.58,44.8c-1.17,9.38-4.68,16.9-9.62,20.34c8.75-3.4,15.45-10.2,18.9-18.5C64.02,45.27,60.59,44.65,55.58,44.8"/>
    </svg>
  )
}

export default function LoginPage() {
  const [showLogin, setShowLogin] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [dark, setDark] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const stored = localStorage.getItem('ih-dark-mode')
    if (stored !== null) {
      setDark(stored === 'true')
    } else {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      localStorage.setItem('ih-dark-mode', String(systemDark))
      setDark(systemDark)
    }
  }, [])

  function toggleTheme() {
    setDark(d => {
      const next = !d
      localStorage.setItem('ih-dark-mode', String(next))
      document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
      return next
    })
  }

  useEffect(() => {
    if (!showLogin) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowLogin(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showLogin])

  // O tour abre o modal de acesso no passo "Entre em qualquer perfil"
  useEffect(() => {
    const open = () => setShowLogin(true)
    const close = () => setShowLogin(false)
    window.addEventListener('ih:open-login', open)
    window.addEventListener('ih:close-login', close)
    return () => {
      window.removeEventListener('ih:open-login', open)
      window.removeEventListener('ih:close-login', close)
    }
  }, [])

  function enterAs(persona: PersonaId) {
    if (loading) return
    setError(null)
    setLoading(true)
    clearUserCache()
    const target = loginAs(persona)
    setSuccess(true)
    setTimeout(() => router.push(target), 700)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('Versão de demonstração: use um dos botões "Acessar como" abaixo.')
  }

  return (
    <main className="ih-landing" data-theme={dark ? 'dark' : 'light'}>
      <div className="ih-landing-aurora" aria-hidden="true" />
      <div className="ih-landing-dots" aria-hidden="true" />

      {/* Header */}
      <header className="ih-landing-header">
        <div className="ih-landing-brand">
          <div className="ih-landing-brand-row">
            <EurofarmaLogo size={40} color={dark ? '#FFFFFF' : '#00358E'} />
            <div>
              <div className="ih-landing-brand-name">Eurofarma</div>
              <div className="ih-landing-brand-sub">Innovation HUB</div>
            </div>
          </div>
        </div>
        <button
          className="ih-landing-theme-toggle"
          onClick={toggleTheme}
          aria-label={dark ? 'Modo claro' : 'Modo escuro'}
        >
          <Icon name={dark ? 'sun' : 'moon'} size={15} />
        </button>
      </header>

      {/* Two-column grid */}
      <section className="ih-landing-body">
        <div className="ih-landing-grid">

          {/* Left rail */}
          <div className="ih-landing-rail">
            <h1 className="ih-landing-display">
              Ideias que
              <br />
              <span>transformam</span>
            </h1>
            <p className="ih-landing-lede">
              Traga o que você enxerga no dia a dia. A Eura estrutura em proposta,
              a comunidade valida e cada contribuição gera impacto real na Eurofarma.
            </p>
            <div className="ih-landing-divider" />
            <div className="ih-landing-modules">
              <span className="ih-landing-modules-label">Aproveite o que a plataforma oferece:</span>
              <div className="ih-landing-pillars">
                {PILLARS.map(p => (
                  <div key={p.label} className="ih-landing-pillar" data-label={p.desc}>
                    <Icon name={p.icon} size={14} />
                    {p.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: chat card */}
          <div className="ih-landing-chat-wrap">

            <div className="ih-landing-card">
              <div className="ih-landing-card-inner">

                {/* Chat header */}
                <div className="ih-landing-chat-header">
                  <EuraAvatarLanding size={38} dark={dark} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="ih-landing-chat-name">EURA · IA Innovation</div>
                    <div className="ih-landing-chat-sub">Mentor digital de inovação corporativa</div>
                  </div>
                </div>

                {/* Chat messages */}
                <div className="ih-landing-chat-body">
                  {CHAT_MESSAGES.map((m, i) => (
                    <div key={i} className={`ih-chat-msg ih-chat-msg--${m.type}`}>
                      {m.type === 'bot' && <EuraAvatarLanding size={26} dark={dark} />}
                      <div className="ih-chat-bubble">{m.text}</div>
                    </div>
                  ))}
                  <div className="ih-chat-msg ih-chat-msg--bot">
                    <EuraAvatarLanding size={26} dark={dark} />
                    <div className="ih-chat-bubble ih-chat-typing">
                      <span /><span /><span />
                    </div>
                  </div>
                </div>

                {/* Composer CTA */}
                <div className="ih-landing-composer-label">
                  Traga sua ideia. A Eura faz o resto.
                </div>
                <div className="ih-landing-composer">
                  <div className="ih-landing-composer-field" onClick={() => setShowLogin(true)} style={{ cursor: 'pointer' }}>
                    <span className="ih-landing-composer-hint">
                      Entre e comece sua ideia com a Eura
                      <span className="ih-landing-caret" />
                    </span>
                  </div>
                  <button className="ih-landing-cta" onClick={() => setShowLogin(true)}>
                    Acessar a plataforma
                    <Icon name="chevron-right" size={16} />
                  </button>
                </div>

              </div>
            </div>

          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="ih-landing-foot">
        <span className="ih-landing-foot-copy">Eurofarma · FIAP Global Solution 2026</span>
        <span className="ih-landing-foot-copy">Demonstração com dados simulados</span>
      </footer>

      {/* Login modal */}
      {showLogin && (
        <>
          <div
            className="ih-modal-backdrop"
            onClick={() => setShowLogin(false)}
            aria-hidden="true"
          />
          <div className="ih-modal-wrap" role="dialog" aria-modal="true" aria-label="Acesso à plataforma">
            {success ? (
              <div className="ih-login-card ih-login-success">
                <div className="ih-login-loader" role="status" aria-label="Carregando redirecionamento">
                  <span className="ih-login-loader-dot" aria-hidden="true" />
                </div>
                <h2 className="ih-form-title" style={{ marginTop: 20 }}>Bem-vindo!</h2>
                <p className="ih-form-sub">Redirecionando para o Dashboard...</p>
              </div>
            ) : (
              <div className="ih-login-card">
                <button
                  className="ih-modal-close"
                  onClick={() => setShowLogin(false)}
                  aria-label="Fechar"
                >
                  <Icon name="x" size={16} />
                </button>

                <div className="ih-card-logo">
                  <EurofarmaLogo size={40} color={dark ? '#FFFFFF' : '#00358E'} />
                  <div>
                    <div className="ih-card-brand-name">Eurofarma</div>
                    <div className="ih-card-brand-product">Innovation HUB</div>
                  </div>
                </div>

                <h2 className="ih-form-title">Acesse sua conta</h2>
                <p className="ih-form-sub">Entre com seu e-mail corporativo para continuar.</p>

                <form onSubmit={handleSubmit}>
                  <div className="ih-field">
                    <label htmlFor="email">E-mail</label>
                    <div style={{ position: 'relative' }}>
                      <Icon
                        name="mail"
                        size={16}
                        style={{
                          position: 'absolute',
                          left: 12,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: 'var(--ink-3)',
                        }}
                      />
                      <input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="ih-input"
                        placeholder="seu@email.com"
                        style={{ paddingLeft: 38 }}
                      />
                    </div>
                  </div>

                  <div className="ih-field">
                    <label htmlFor="password">Senha</label>
                    <div style={{ position: 'relative' }}>
                      <Icon
                        name="lock"
                        size={16}
                        style={{
                          position: 'absolute',
                          left: 12,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: 'var(--ink-3)',
                        }}
                      />
                      <input
                        id="password"
                        type={showPwd ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="ih-input"
                        placeholder="••••••••"
                        style={{ paddingLeft: 38, paddingRight: 42 }}
                      />
                      <button
                        type="button"
                        className="ih-pwd-toggle"
                        onClick={() => setShowPwd(v => !v)}
                        aria-label={showPwd ? 'Ocultar senha' : 'Mostrar senha'}
                      >
                        <Icon name={showPwd ? 'eye-off' : 'eye'} size={15} />
                      </button>
                    </div>
                  </div>

                  {error && <p className="ih-error">{error}</p>}

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary btn-lg"
                    style={{ width: '100%', marginTop: 4, display: 'flex', justifyContent: 'center', position: 'relative' }}
                  >
                    {loading ? (
                      <><span className="spin" />Entrando...</>
                    ) : (
                      <>Entrar<Icon name="chevron-right" size={15} className="ih-totem-link-chevron" /></>
                    )}
                  </button>
                </form>

                <div className="ih-totem-divider"><span>Acessar como</span></div>

                <div className="ih-role-grid">
                  {ROLE_OPTIONS.map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      className="ih-totem-link ih-role-btn"
                      data-role={role.id}
                      disabled={loading}
                      onClick={() => enterAs(role.id)}
                    >
                      <Icon name={role.icon} size={15} />
                      {role.label}
                    </button>
                  ))}
                </div>

                <p className="ih-card-footer-text">Innovation HUB Eurofarma</p>

              </div>
            )}
          </div>
        </>
      )}

    </main>
  )
}
