'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { clearUserCache, useUser } from '@/hooks/useUser'
import Icon from '@/components/shared/Icon'
import ProfileShell from '@/components/shared/ProfileShell'
import RankingPodium from '@/components/shared/RankingPodium'
import { fetchLeaderboard, updateRankingVisibility, type LeaderboardUser } from '@/services/ideasService'

type RankingTab = 'geral' | 'setor'

const LEVEL_NAMES: Record<number, string> = {
  1: 'Aprendiz', 2: 'Pensador', 3: 'Inovador', 4: 'Especialista', 5: 'Referência',
}

const LEVEL_TIERS = [
  { level: 1, name: 'Aprendiz', min: 0, max: 500, color: '#64748b' },
  { level: 2, name: 'Pensador', min: 501, max: 1500, color: '#0057A8' },
  { level: 3, name: 'Inovador', min: 1501, max: 5000, color: '#4f46e5' },
  { level: 4, name: 'Especialista', min: 5001, max: 10000, color: '#C49600' },
  { level: 5, name: 'Referência', min: 10001, max: null, color: '#b88a2b' },
]

const RANK_META = [
  {
    rank: '1º',
    label: 'Ouro',
    bg: 'var(--leaderboard-gold-bg)',
    color: 'var(--leaderboard-gold-text)',
    border: 'var(--leaderboard-gold-border)',
    accent: 'var(--leaderboard-gold-accent)',
  },
  {
    rank: '2º',
    label: 'Prata',
    bg: 'var(--leaderboard-silver-bg)',
    color: 'var(--leaderboard-silver-text)',
    border: 'var(--leaderboard-silver-border)',
    accent: 'var(--leaderboard-silver-accent)',
  },
  {
    rank: '3º',
    label: 'Bronze',
    bg: 'var(--leaderboard-bronze-bg)',
    color: 'var(--leaderboard-bronze-text)',
    border: 'var(--leaderboard-bronze-border)',
    accent: 'var(--leaderboard-bronze-accent)',
  },
]

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
}

function getRankMeta(index: number) {
  return RANK_META[index] ?? {
    rank: String(index + 1),
    label: 'Posição',
    bg: 'var(--surface-2)',
    color: 'var(--ink-3)',
    border: 'var(--line)',
    accent: 'var(--accent)',
  }
}

function getAvatarColor(index: number) {
  return getRankMeta(index).accent
}

function formatPoints(value: number) {
  return value.toLocaleString('pt-BR')
}

function getLevelRangeLabel(min: number, max: number | null) {
  if (max === null) return `Acima de ${formatPoints(min - 1)} pts`
  if (min === 0) return `Até ${formatPoints(max)} pts`
  return `${formatPoints(min)} a ${formatPoints(max)} pts`
}

export default function LeaderboardPage() {
  const { user, loading: userLoading } = useUser()
  const [users, setUsers] = useState<LeaderboardUser[]>([])
  const [search, setSearch] = useState('')
  const [visible, setVisible] = useState(true)
  const [tab, setTab] = useState<RankingTab>('geral')
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [updatingVisibility, setUpdatingVisibility] = useState(false)
  const [rankingPage, setRankingPage] = useState(0)
  const USERS_PER_PAGE = 5

  useEffect(() => {
    if (user) setVisible(user.is_visible_in_ranking)
  }, [user])

  useEffect(() => {
    let active = true

    async function loadRanking() {
      setLoading(true)
      setFeedback(null)
      try {
        const data = await fetchLeaderboard()
        if (active) setUsers(data)
      } catch {
        if (active) setFeedback('Erro ao carregar ranking.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadRanking()
    return () => { active = false }
  }, [])

  const rankedUsers = useMemo(() => {
    let list = users

    if (tab === 'setor') {
      list = list.filter((u) => u.sector_id === user?.sector_id)
    }

    return list
  }, [users, tab, user?.sector_id])

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (term) return rankedUsers.filter((u) => u.name.toLowerCase().includes(term))

    return rankedUsers
  }, [rankedUsers, search])

  useEffect(() => {
    setRankingPage(0)
  }, [tab, search, user?.sector_id])

  if (userLoading) return <p className="ih-loading-page">Carregando...</p>

  async function handleVisibilityChange(nextVisible: boolean) {
    if (!user?.id || updatingVisibility) return
    setUpdatingVisibility(true)
    setVisible(nextVisible)
    setFeedback(null)
    try {
      await updateRankingVisibility(user.id, nextVisible)
      clearUserCache()
      const data = await fetchLeaderboard()
      setUsers(data)
      setRankingPage(0)
      setFeedback(
        nextVisible
          ? 'Seu perfil voltou ao ranking público.'
          : 'Privacidade ativada: você saiu da lista pública, mas continua acumulando pontos e nível.'
      )
    } catch {
      setVisible(!nextVisible)
      setFeedback('Erro ao atualizar privacidade.')
    } finally {
      setUpdatingVisibility(false)
    }
  }

  const podium = rankedUsers.slice(0, 3)
  const totalRankingPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE)
  const currentRankingPage = Math.min(rankingPage, Math.max(totalRankingPages - 1, 0))
  const paginatedUsers = filteredUsers.slice(
    currentRankingPage * USERS_PER_PAGE,
    currentRankingPage * USERS_PER_PAGE + USERS_PER_PAGE
  )
  const currentLevel = user?.level ?? 1
  const nextLevel = LEVEL_TIERS.find((tier) => tier.level === currentLevel + 1)

  return (
    <ProfileShell
      profile="funcionario"
      title="Ranking"
      subtitle="Acompanhe a pontuação e celebre os melhores"
      user={user}
      points={user?.points ?? 0}
      notifCount={2}
      pageBodyClass="light-page"
    >
      <div className="ih-dashboard-stack leaderboard-page">
        <section className="card leaderboard-levels-card">
          <div className="ih-section-head">
            <div>
              <div className="ih-section-title">Níveis disponíveis</div>
              <div className="leaderboard-section-sub">
                Veja a pontuação necessária para atingir cada nível.
              </div>
            </div>
            <span className="badge badge-blue">
              Seu nível: NV {currentLevel}
            </span>
          </div>

          <div className="leaderboard-level-grid">
            {LEVEL_TIERS.map((tier) => {
              const isCurrent = tier.level === currentLevel

              return (
                <div
                  key={tier.level}
                  className={`leaderboard-level-tier${isCurrent ? ' is-current' : ''}`}
                  style={{ '--level-color': tier.color } as CSSProperties}
                >
                  <div className="leaderboard-level-mark">
                    <Icon name="award" size={14} />
                    NV {tier.level}
                  </div>
                  <div className="leaderboard-level-name">{tier.name}</div>
                  <div className="leaderboard-level-range">
                    {getLevelRangeLabel(tier.min, tier.max)}
                  </div>
                  {isCurrent && (
                    <span className="leaderboard-current-level">Você está aqui</span>
                  )}
                </div>
              )
            })}
          </div>

          {nextLevel && (
            <div className="leaderboard-next-level">
              Próximo nível: NV {nextLevel.level} · {nextLevel.name}, a partir de {formatPoints(nextLevel.min)} pts.
            </div>
          )}
        </section>

        {/* Tabs */}
        <div
          className="leaderboard-tabs"
          style={{
            display: 'flex',
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r-lg)',
            overflow: 'hidden',
          }}
        >
          {([
            { id: 'geral', label: 'Ranking Geral', icon: 'award' },
            { id: 'setor', label: 'Ranking do Setor', icon: 'building' },
          ] as const).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '13px 20px',
                border: 'none',
                borderBottom: tab === t.id ? '2px solid var(--leaderboard-tab-active-border)' : '2px solid transparent',
                background: tab === t.id ? 'color-mix(in srgb, var(--leaderboard-tab-active-text) 8%, transparent)' : 'transparent',
                color: tab === t.id ? 'var(--leaderboard-tab-active-text)' : 'var(--ink-3)',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <Icon name={t.icon} size={15} />
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div
            style={{
              padding: '40px',
              textAlign: 'center',
              color: 'var(--ink-3)',
              fontSize: 13,
            }}
          >
            Carregando ranking...
          </div>
        ) : (
          <>
            {/* Podium (top 3) */}
            {podium.length > 0 && !search && (
              <section className="card">
                <div className="ih-section-head">
                  <div className="ih-section-title">
                    {tab === 'setor' ? 'Destaques do Setor' : 'Top 3'}
                  </div>
                  <span className="badge badge-gray">{rankedUsers.length} colaboradores</span>
                </div>
                <RankingPodium users={podium} currentUserId={user?.id} />
              </section>
            )}

            {/* Full list */}
            <section className="card">
              <div className="ih-section-head">
                <div className="ih-section-title">
                  {search ? `Resultado: "${search}"` : 'Classificação completa'}
                </div>
                <span className="badge badge-blue">{filteredUsers.length}</span>
              </div>

              <section className="leaderboard-controls leaderboard-card-controls">
                <input
                  className="ih-input leaderboard-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nome..."
                />
                <div className="leaderboard-privacy-card">
                  <Icon name="eye" size={14} style={{ color: 'var(--ink-3)' }} />
                  <div className="leaderboard-privacy-copy">
                    <label htmlFor="ranking-visible">
                      Aparecer no ranking
                    </label>
                    <span>
                      {visible
                        ? 'Seu nome, setor e pontos aparecem para os colaboradores.'
                        : 'Você fica fora da lista pública, mas continua pontuando.'}
                    </span>
                  </div>
                  <button
                    id="ranking-visible"
                    type="button"
                    role="switch"
                    aria-checked={visible}
                    aria-label={visible ? 'Ocultar meu perfil no ranking' : 'Mostrar meu perfil no ranking'}
                    disabled={updatingVisibility}
                    onClick={() => handleVisibilityChange(!visible)}
                    style={{
                      width: 40,
                      height: 22,
                      borderRadius: 999,
                      border: 'none',
                      cursor: updatingVisibility ? 'wait' : 'pointer',
                      background: visible ? 'var(--accent)' : 'var(--surface-2)',
                      position: 'relative',
                      transition: 'background 0.2s',
                      flexShrink: 0,
                      opacity: updatingVisibility ? 0.7 : 1,
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: 3,
                        left: visible ? 21 : 3,
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: '#fff',
                        transition: 'left 0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,.2)',
                      }}
                    />
                  </button>
                </div>
              </section>

              {!visible && (
                <div className="leaderboard-card-message">
                  <div className="leaderboard-privacy-note">
                    <Icon name="eye" size={16} />
                    <div>
                      <strong>Seu perfil está oculto.</strong>
                      <span>
                        Você não aparece na classificação pública, mas seus pontos, resgates e nível continuam sendo atualizados normalmente.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {feedback && (
                <div className="leaderboard-card-message">
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: 10,
                      background: feedback.includes('Erro')
                        ? 'rgba(229,62,62,.08)'
                        : 'color-mix(in srgb, var(--accent) 10%, transparent)',
                      color: feedback.includes('Erro') ? 'var(--danger)' : 'var(--accent)',
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {feedback}
                  </div>
                </div>
              )}

              {filteredUsers.length === 0 ? (
                <div
                  style={{
                    margin: '0 20px 20px',
                    padding: '40px',
                    textAlign: 'center',
                    color: 'var(--ink-3)',
                    fontSize: 13,
                    border: '1px dashed var(--line)',
                    borderRadius: 'var(--r-lg)',
                  }}
                >
                  {search
                    ? 'Nenhum colaborador encontrado para essa busca.'
                    : tab === 'setor'
                      ? 'Nenhum colaborador visível no ranking do seu setor.'
                      : 'Nenhum colaborador encontrado.'}
                </div>
              ) : (
                <div className="ih-list">
                  {paginatedUsers.map((person, index) => {
                    const globalIndex = currentRankingPage * USERS_PER_PAGE + index
                    const isCurrentUser = person.id === user?.id
                    const rank = getRankMeta(globalIndex)
                    const levelName = LEVEL_NAMES[person.level ?? 1] ?? 'Aprendiz'

                    return (
                      <div
                        className="ih-list-row leaderboard-list-row"
                        key={person.id}
                        style={{
                          background: isCurrentUser ? 'color-mix(in srgb, var(--accent) 4%, transparent)' : 'transparent',
                        }}
                      >
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 999,
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: globalIndex < 3 ? 14 : 11,
                            fontWeight: 800,
                            color: rank.color,
                            background: rank.bg,
                          }}
                        >
                          {rank.rank}
                        </div>

                        <div
                          className="ih-avatar"
                          style={{ background: getAvatarColor(globalIndex), flexShrink: 0 }}
                        >
                          {initials(person.name)}
                        </div>

                        <div className="leaderboard-list-main" style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ color: 'var(--ink)', fontSize: 13, fontWeight: 800 }}>
                            {person.name}
                            {isCurrentUser && (
                              <span style={{ fontSize: 10.5, marginLeft: 6, color: 'var(--accent)', fontWeight: 700 }}>
                                você
                              </span>
                            )}
                          </div>
                          <div style={{ color: 'var(--ink-3)', fontSize: 11, marginTop: 1 }}>
                            {person.sector_name ?? 'Setor não informado'}
                          </div>
                        </div>

                        <div className="leaderboard-list-score" style={{ textAlign: 'right', flexShrink: 0 }}>
                          <span
                            className="badge badge-gray"
                            style={{ marginBottom: 3, justifyContent: 'flex-end' }}
                          >
                            NV {person.level} · {levelName}
                          </span>
                          <div className="tabnum" style={{ color: 'var(--accent)', fontWeight: 800, fontSize: 13 }}>
                            {(person.points ?? 0).toLocaleString('pt-BR')} pts
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {filteredUsers.length > USERS_PER_PAGE && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 14px', gap: 8 }}>
                      <button
                        type="button"
                        className="btn btn-muted btn-sm"
                        disabled={currentRankingPage === 0}
                        onClick={() => setRankingPage((p) => p - 1)}
                        style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <Icon name="chevron-left" size={13} /> Anterior
                      </button>
                      <span style={{ color: 'var(--ink-3)', fontSize: 11, fontWeight: 700 }}>
                        {currentRankingPage + 1} / {totalRankingPages}
                      </span>
                      <button
                        type="button"
                        className="btn btn-muted btn-sm"
                        disabled={currentRankingPage >= totalRankingPages - 1}
                        onClick={() => setRankingPage((p) => p + 1)}
                        style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        Próximo <Icon name="chevron-right" size={13} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </ProfileShell>
  )
}
