'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import Icon from '@/components/shared/Icon'
import ProfileShell from '@/components/shared/ProfileShell'
import { createClient } from '@/lib/supabase/client'
import { clearUserCache } from '@/hooks/useUser'
import {
  cancelMentorApplication,
  deactivateOwnMentorProfile,
  fetchMyCandidateProfile,
  updateMentorProfile,
  type MentorProfile,
} from '@/services/mentorshipService'

function subscribeTheme(cb: () => void) {
  window.addEventListener('ih:theme', cb)
  return () => window.removeEventListener('ih:theme', cb)
}
function getThemeSnapshot() {
  return typeof window !== 'undefined' && localStorage.getItem('ih-dark-mode') === 'true'
}

// Interpola de --ink para o acento do tema sem cruzar verde no sRGB
function getPointsStyle(points: number, maxCost: number, dark: boolean): { color: string; textShadow: string } {
  if (!maxCost || maxCost <= 0 || points <= 0) return { color: 'var(--ink)', textShadow: 'none' }
  const t = Math.min(1, Math.max(0, points / maxCost))
  if (t < 0.05) return { color: 'var(--ink)', textShadow: 'none' }
  const [ar, ag, ab] = dark ? [212, 160, 0] : [0, 87, 168]
  const r = Math.round(13 + (ar - 13) * t)
  const g = Math.round(24 + (ag - 24) * t)
  const b = Math.round(41 + (ab - 41) * t)
  const color = `rgb(${r},${g},${b})`
  return { color, textShadow: 'none' }
}

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

function getProgressPercent(points: number, level: number): number {
  if (level >= 5) return 100
  const current = LEVEL_THRESHOLDS.find(([l]) => l === level)
  const next = LEVEL_THRESHOLDS.find(([l]) => l === level + 1)
  if (!current || !next) return 0
  const rangeStart = current[1]
  const rangeEnd = next[1]
  const progress = ((points - rangeStart) / (rangeEnd - rangeStart)) * 100
  return Math.min(100, Math.max(0, progress))
}

function getNextLevelThreshold(level: number): number | null {
  const next = LEVEL_THRESHOLDS.find(([l]) => l === level + 1)
  return next ? next[1] : null
}

export default function ProfilePage() {
  const { user, loading } = useUser()
  const router = useRouter()
  const isDark = useSyncExternalStore(subscribeTheme, getThemeSnapshot, () => false)
  const [isVisible, setIsVisible] = useState<boolean | null>(null)
  const [toggling, setToggling] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sectorName, setSectorName] = useState<string | null>(null)
  const [rankGlobal, setRankGlobal] = useState<number | null>(null)
  const [rankSector, setRankSector] = useState<number | null>(null)
  const [maxMarketplaceCost, setMaxMarketplaceCost] = useState(0)
  const [candidate, setCandidate] = useState<MentorProfile | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [submittingMentor, setSubmittingMentor] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [mentorFeedback, setMentorFeedback] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [editMentorOpen, setEditMentorOpen] = useState(false)
  const [editMentorArea, setEditMentorArea] = useState('')
  const [editMentorSectorId, setEditMentorSectorId] = useState<string>('all')

  useEffect(() => {
    let active = true

    async function loadProfile() {
      if (!user?.id) return
      setDataLoading(true)
      setError(null)

      try {
        const supabase = createClient()

        const [sectorResult, allUsersResult, marketplaceResult, candidateResult] = await Promise.all([
          user.sector_id
            ? supabase.from('sectors').select('name').eq('id', user.sector_id).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
          supabase.from('users').select('id, points, sector_id').eq('is_visible_in_ranking', true).order('points', { ascending: false }),
          supabase.from('marketplace_items').select('cost_points').order('cost_points', { ascending: false }).limit(1),
          fetchMyCandidateProfile(user.id),
        ])

        if (!active) return

        if (sectorResult.data) {
          setSectorName((sectorResult.data as { name: string }).name)
        }

        if (allUsersResult.data) {
          const users = allUsersResult.data as { id: string; points: number; sector_id: string | null }[]
          const globalIdx = users.findIndex((u) => u.id === user.id)
          setRankGlobal(globalIdx >= 0 ? globalIdx + 1 : null)

          if (user.sector_id) {
            const sectorUsers = users.filter((u) => u.sector_id === user.sector_id)
            const sectorIdx = sectorUsers.findIndex((u) => u.id === user.id)
            setRankSector(sectorIdx >= 0 ? sectorIdx + 1 : null)
          }
        }

        if (marketplaceResult.data?.[0]) {
          setMaxMarketplaceCost((marketplaceResult.data[0] as { cost_points: number }).cost_points)
        }

        setCandidate(candidateResult)
      } catch {
        if (!active) return
        setError('Erro ao carregar perfil.')
      } finally {
        if (active) setDataLoading(false)
      }
    }

    loadProfile()

    return () => {
      active = false
    }
  }, [user?.id, user?.points, user?.sector_id])

  async function handleToggleVisibility() {
    if (!user?.id || toggling) return
    setToggling(true)
    const currentVisible = isVisible ?? (user.is_visible_in_ranking ?? true)
    try {
      const supabase = createClient()
      const newValue = !currentVisible
      const { error: updateError } = await supabase
        .from('users')
        .update({ is_visible_in_ranking: newValue })
        .eq('id', user.id)
      if (updateError) throw updateError
      clearUserCache()
      setIsVisible(newValue)
    } catch {
      setError('Erro ao atualizar privacidade.')
    } finally {
      setToggling(false)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function handleCancelApplication() {
    if (!user?.id) return
    setSubmittingMentor(true)
    setMentorFeedback(null)
    try {
      await cancelMentorApplication(user.id)
      setCandidate(null)
      setMentorFeedback('Candidatura cancelada.')
    } catch {
      setMentorFeedback('Erro ao cancelar candidatura.')
    } finally {
      setSubmittingMentor(false)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function handleDeactivateMentorProfile() {
    if (!user?.id) return
    if (!window.confirm('Deixar de aparecer no painel de mentores ativos? Suas mentorias já registradas serão mantidas no histórico.')) return
    setSubmittingMentor(true)
    setMentorFeedback(null)
    try {
      await deactivateOwnMentorProfile(user.id)
      const updated = await fetchMyCandidateProfile(user.id)
      setCandidate(updated)
      setMentorFeedback('Perfil removido do painel de mentores ativos.')
    } catch {
      setMentorFeedback('Erro ao deixar de ser mentor.')
    } finally {
      setSubmittingMentor(false)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function handleUpdateMentorProfile() {
    if (!user?.id) return
    setSubmittingMentor(true)
    setMentorFeedback(null)
    try {
      await updateMentorProfile(user.id, editMentorSectorId === 'all' ? null : editMentorSectorId, editMentorArea)
      const updated = await fetchMyCandidateProfile(user.id)
      setCandidate(updated)
      setEditMentorOpen(false)
      setMentorFeedback('Perfil de mentor atualizado.')
    } catch {
      setMentorFeedback('Erro ao atualizar perfil de mentor.')
    } finally {
      setSubmittingMentor(false)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function openEditMentor() {
    if (!candidate) return
    setEditMentorArea(candidate.knowledge_area)
    setEditMentorSectorId(candidate.sector_id ?? 'all')
    setEditMentorOpen(true)
  }

  if (loading) return <p className="ih-loading-page">Carregando...</p>

  // Tokens V4-D+: azul no light, amarelo no dark — sem verde
  const C = {
    accent:        isDark ? '#D4A000'              : '#0057A8',
    accentBg:      isDark ? 'rgba(212,160,0,.14)'  : 'rgba(0,87,168,.1)',
    accentSubtle:  isDark ? 'rgba(212,160,0,.1)'   : 'rgba(0,87,168,.08)',
    accentBorder:  isDark ? 'rgba(212,160,0,.22)'  : 'rgba(0,87,168,.18)',
    accentGrad:    isDark
      ? 'linear-gradient(90deg, #C49600, #D4A000)'
      : 'linear-gradient(90deg, #0057A8, #003e7a)',
    accentShadow:  isDark ? 'rgba(212,160,0,.2)'   : 'rgba(0,87,168,.18)',
  }

  const displayVisible = isVisible ?? (user?.is_visible_in_ranking ?? true)
  const points = user?.points ?? 0
  const level = user?.level ?? 1
  const levelName = LEVEL_NAMES[level] ?? 'Aprendiz'
  const progressPercent = getProgressPercent(points, level)
  const nextThreshold = getNextLevelThreshold(level)
  const isMaxLevel = level >= 5
  const pointsStyle = getPointsStyle(points, maxMarketplaceCost, isDark)

  return (
    <>
    <ProfileShell
      profile="funcionario"
      title="Meu Perfil"
      subtitle="Sua jornada de inovação na Eurofarma"
      user={user}
      points={points}
      pageBodyClass="light-page"
    >
      <div className="ih-dashboard-stack">
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

        {/* Identity card */}
        <div className="card">
          <div className="card-p" style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: C.accent,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: '#fff',
                fontSize: 22,
                fontWeight: 900,
              }}
            >
              {(user?.name ?? 'IH')
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((p) => p[0]?.toUpperCase())
                .join('')}
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
                    background: C.accentBg,
                    color: C.accent,
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  <Icon name="award" size={11} />
                  Nível {level} · {levelName}
                </span>
                {sectorName && (
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
                    {sectorName}
                  </span>
                )}
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
                    textTransform: 'capitalize',
                  }}
                >
                  {user?.role ?? 'funcionario'}
                </span>
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1, ...pointsStyle }}>
                {points.toLocaleString('pt-BR')}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4, fontWeight: 600 }}>
                pontos totais
              </div>
            </div>
          </div>
        </div>

        {/* Ranking position */}
        {(rankGlobal !== null || rankSector !== null) && (
          <div className="card">
            <div className="card-p">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
                <div className="ih-section-title">Posição no Ranking</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: rankSector !== null ? '1fr 1fr' : '1fr', gap: 12 }}>
                {rankGlobal !== null && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      padding: '16px 8px',
                      borderRadius: 'var(--r-lg)',
                      background: 'var(--surface-2)',
                      textAlign: 'center',
                      cursor: 'pointer',
                    }}
                    onClick={() => router.push('/leaderboard')}
                  >
                    <Icon name="trending-up" size={18} style={{ color: C.accent }} />
                    <div style={{ fontSize: 28, fontWeight: 900, color: C.accent, lineHeight: 1 }}>
                      #{rankGlobal}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', lineHeight: 1.3 }}>
                      Ranking global
                    </div>
                  </div>
                )}
                {rankSector !== null && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      padding: '16px 8px',
                      borderRadius: 'var(--r-lg)',
                      background: 'var(--surface-2)',
                      textAlign: 'center',
                      cursor: 'pointer',
                    }}
                    onClick={() => router.push('/leaderboard')}
                  >
                    <Icon name="users" size={18} style={{ color: C.accent }} />
                    <div style={{ fontSize: 28, fontWeight: 900, color: C.accent, lineHeight: 1 }}>
                      #{rankSector}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', lineHeight: 1.3 }}>
                      No seu setor
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Level progress */}
        <div className="card">
          <div className="card-p">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
              <div>
                <div className="ih-section-title">Progresso de Nível</div>
                <div style={{ color: 'var(--ink-3)', fontSize: 12, marginTop: 3 }}>
                  {isMaxLevel
                    ? 'Nível máximo atingido!'
                    : `${progressPercent.toFixed(0)}% até ${LEVEL_NAMES[level + 1] ?? 'próximo nível'}`}
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '8px 16px',
                  borderRadius: 'var(--r-lg)',
                  background: C.accentSubtle,
                  border: `1px solid ${C.accentBorder}`,
                }}
              >
                <div style={{ fontSize: 20, fontWeight: 900, color: C.accent, lineHeight: 1 }}>
                  NV {level}
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.accent, marginTop: 2 }}>
                  {levelName}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-4)', marginBottom: 8, fontWeight: 700 }}>
              <span>{LEVEL_NAMES[level]}</span>
              <span>{level < 5 ? LEVEL_NAMES[level + 1] ?? '' : '—'}</span>
            </div>

            <div style={{ height: 12, borderRadius: 999, background: 'var(--surface-2)', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${progressPercent}%`,
                  borderRadius: 999,
                  background: C.accentGrad,
                  transition: 'width 0.6s cubic-bezier(.4,0,.2,1)',
                  boxShadow: `0 2px 8px ${C.accentShadow}`,
                }}
              />
            </div>

            {!isMaxLevel && nextThreshold !== null && (
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 8, textAlign: 'right', fontWeight: 600 }}>
                {points.toLocaleString('pt-BR')} / {nextThreshold.toLocaleString('pt-BR')} pts
              </div>
            )}
          </div>
        </div>

        {/* Privacy toggle */}
        <div className="card">
          <div className="card-p">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
              <div className="ih-section-title">Privacidade no Ranking</div>
            </div>
            <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '0 0 16px' }} />

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
                  Aparecer no ranking público
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 3 }}>
                  {!displayVisible
                    ? 'Você não aparece no ranking público, mas continua acumulando pontos e subindo de nível.'
                    : 'Seu nome e pontuação aparecem no ranking para outros funcionários.'}
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleVisibility}
                disabled={toggling || dataLoading}
                style={{
                  flexShrink: 0,
                  width: 44,
                  height: 24,
                  borderRadius: 999,
                  border: 'none',
                  cursor: toggling ? 'not-allowed' : 'pointer',
                  background: displayVisible ? C.accent : 'var(--surface-2)',
                  position: 'relative',
                  transition: 'background 0.2s',
                  opacity: toggling ? 0.6 : 1,
                }}
                aria-label="Alternar visibilidade no ranking"
              >
                <span
                  style={{
                    position: 'absolute',
                    top: 3,
                    left: displayVisible ? 23 : 3,
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: '#fff',
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,.2)',
                  }}
                />
              </button>
            </div>
          </div>
        </div>

      </div>
    </ProfileShell>
    </>
  )
}
