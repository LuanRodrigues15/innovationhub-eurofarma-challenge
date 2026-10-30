'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { clearUserCache, useUser } from '@/hooks/useUser'
import Icon from '@/components/shared/Icon'
import RankingPodium from '@/components/shared/RankingPodium'
import {
  fetchLeaderboard,
  updateRankingVisibility,
  type LeaderboardUser,
} from '@/services/ideasService'

type RankingTab = 'geral' | 'setor'

const USERS_PER_PAGE = 5


const LEVEL_NAMES: Record<number, string> = {
  1: 'Aprendiz',
  2: 'Pensador',
  3: 'Inovador',
  4: 'Especialista',
  5: 'Referência',
}

const LEVEL_TIERS = [
  { level: 1, name: 'Aprendiz', min: 0, max: 500, color: '#94a3b8' },
  { level: 2, name: 'Pensador', min: 501, max: 1500, color: '#7dd3fc' },
  { level: 3, name: 'Inovador', min: 1501, max: 5000, color: '#a78bfa' },
  { level: 4, name: 'Especialista', min: 5001, max: 10000, color: '#34d399' },
  { level: 5, name: 'Referência', min: 10001, max: null, color: '#f6c35b' },
]

const RANK_META = [
  { rank: '1º', label: 'Ouro', bg: 'rgba(246,195,91,.14)', color: '#f6c35b', border: 'rgba(246,195,91,.34)', accent: '#f6c35b' },
  { rank: '2º', label: 'Prata', bg: 'rgba(203,213,225,.12)', color: '#dbeafe', border: 'rgba(203,213,225,.26)', accent: '#cbd5e1' },
  { rank: '3º', label: 'Bronze', bg: 'rgba(251,146,60,.13)', color: '#fdba74', border: 'rgba(251,146,60,.28)', accent: '#fb923c' },
]

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')
}

function getRankMeta(index: number) {
  return RANK_META[index] ?? {
    rank: String(index + 1),
    label: 'Posição',
    bg: 'rgba(255,255,255,.08)',
    color: 'rgba(255,255,255,.72)',
    border: 'rgba(255,255,255,.12)',
    accent: 'var(--c-totem)',
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

export default function TotemRankingPage() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const [users, setUsers] = useState<LeaderboardUser[]>([])
  const [search, setSearch] = useState('')
  const [visible, setVisible] = useState(true)
  const [tab, setTab] = useState<RankingTab>('geral')
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [updatingVisibility, setUpdatingVisibility] = useState(false)
  const [rankingPage, setRankingPage] = useState(0)

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
    return () => {
      active = false
    }
  }, [])

  const rankedUsers = useMemo(() => {
    if (tab === 'setor') {
      return users.filter((person) => person.sector_id === user?.sector_id)
    }

    return users
  }, [users, tab, user?.sector_id])

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return rankedUsers
    return rankedUsers.filter((person) => person.name.toLowerCase().includes(term))
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
    <main className="totem-ranking-page">
      <header className="totem-ranking-header">
        <button
          className="totem-ranking-nav"
          type="button"
          onClick={() => router.push('/totem/dashboard')}
        >
          <Icon name="chevron-left" size={22} />
          Voltar
        </button>

        <div className="totem-ranking-heading">
          <span>Modo Totem</span>
          <h1>Ranking</h1>
        </div>

        <div className="totem-ranking-user" aria-label="Usuário atual">
          <div className="ih-avatar" style={{ background: 'var(--c-totem)' }}>
            {initials(user?.name ?? 'Colaborador')}
          </div>
          <div>
            <strong>{user?.name ?? 'Colaborador'}</strong>
            <span>{formatPoints(user?.points ?? 0)} pts · NV {currentLevel}</span>
          </div>
        </div>
      </header>

      <section className="totem-ranking-scroll">
        <div className="totem-ranking-shell">
          <section className="card leaderboard-levels-card">
            <div className="ih-section-head">
              <div>
                <div className="ih-section-title">Níveis disponíveis</div>
                <div className="leaderboard-section-sub">
                  Veja a pontuação necessária para atingir cada nível.
                </div>
              </div>
              <span className="badge badge-blue">Seu nível: NV {currentLevel}</span>
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
                      <Icon name="award" size={15} />
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

          <div className="leaderboard-tabs totem-ranking-tabs">
            {([
              { id: 'geral', label: 'Ranking Geral', icon: 'award' },
              { id: 'setor', label: 'Ranking do Setor', icon: 'building' },
            ] as const).map((item) => (
              <button
                key={item.id}
                className={tab === item.id ? 'is-active' : undefined}
                type="button"
                onClick={() => setTab(item.id)}
              >
                <Icon name={item.icon} size={20} />
                {item.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="totem-ranking-loading">Carregando ranking...</div>
          ) : (
            <>
              {podium.length > 0 && !search && (
                <section className="card">
                  <div className="ih-section-head">
                    <div className="ih-section-title">
                      {tab === 'setor' ? 'Destaques do Setor' : 'Top 3'}
                    </div>
                    <span className="badge badge-gray">{rankedUsers.length} colaboradores</span>
                  </div>
                  <RankingPodium users={podium} currentUserId={user?.id} totem />
                </section>
              )}

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
                    autoComplete="off"
                  />

                  <div className="leaderboard-privacy-card">
                    <Icon name="eye" size={18} style={{ color: 'var(--ink-3)' }} />
                    <div className="leaderboard-privacy-copy">
                      <label htmlFor="totem-ranking-visible">Aparecer no ranking</label>
                      <span>
                        {visible
                          ? 'Seu nome, setor e pontos aparecem para os colaboradores.'
                          : 'Você fica fora da lista pública, mas continua pontuando.'}
                      </span>
                    </div>
                    <button
                      id="totem-ranking-visible"
                      className="totem-ranking-switch"
                      type="button"
                      role="switch"
                      aria-checked={visible}
                      aria-label={visible ? 'Ocultar meu perfil no ranking' : 'Mostrar meu perfil no ranking'}
                      disabled={updatingVisibility}
                      onClick={() => handleVisibilityChange(!visible)}
                    >
                      <span />
                    </button>
                  </div>
                </section>

                {!visible && (
                  <div className="leaderboard-card-message">
                    <div className="leaderboard-privacy-note">
                      <Icon name="eye" size={18} />
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
                    <div className={feedback.includes('Erro') ? 'totem-ranking-feedback is-error' : 'totem-ranking-feedback'}>
                      {feedback}
                    </div>
                  </div>
                )}

                {filteredUsers.length === 0 ? (
                  <div className="totem-ranking-empty">
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
                            background: isCurrentUser ? 'rgba(2,132,199,.12)' : 'transparent',
                          }}
                        >
                          <div className="totem-ranking-list-rank" style={{ color: rank.color, background: rank.bg }}>
                            {rank.rank}
                          </div>

                          <div className="ih-avatar" style={{ background: getAvatarColor(globalIndex), flexShrink: 0 }}>
                            {initials(person.name)}
                          </div>

                          <div className="leaderboard-list-main" style={{ minWidth: 0, flex: 1 }}>
                            <div className="totem-ranking-list-name">
                              {person.name}
                              {isCurrentUser && <span>você</span>}
                            </div>
                            <div className="totem-ranking-person-sector">
                              {person.sector_name ?? 'Setor não informado'}
                            </div>
                          </div>

                          <div className="leaderboard-list-score">
                            <span className="badge badge-gray">
                              NV {person.level} · {levelName}
                            </span>
                            <div className="tabnum">
                              {formatPoints(person.points ?? 0)} pts
                            </div>
                          </div>
                        </div>
                      )
                    })}

                    {filteredUsers.length > USERS_PER_PAGE && (
                      <div className="totem-ranking-pagination">
                        <button
                          type="button"
                          className="btn btn-muted btn-sm"
                          disabled={currentRankingPage === 0}
                          onClick={() => setRankingPage((page) => page - 1)}
                        >
                          <Icon name="chevron-left" size={16} />
                          Anterior
                        </button>
                        <span>{currentRankingPage + 1} / {totalRankingPages}</span>
                        <button
                          type="button"
                          className="btn btn-muted btn-sm"
                          disabled={currentRankingPage >= totalRankingPages - 1}
                          onClick={() => setRankingPage((page) => page + 1)}
                        >
                          Próximo
                          <Icon name="chevron-right" size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </section>

    </main>
  )
}

