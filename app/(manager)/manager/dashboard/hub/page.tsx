'use client'

import { Fragment, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react'
import { useDebounce } from '@/hooks/useDebounce'
import { useIdeas } from '@/hooks/useIdeas'
import { useUser } from '@/hooks/useUser'
import { getIdeaStatusMeta, getImprovementAreaLabel } from '@/components/shared/IdeaCard'
import Icon from '@/components/shared/Icon'
import ProfileShell from '@/components/shared/ProfileShell'
import type { IdeaComment, IdeaListItem, IdeaStatus, ImprovementArea, SortBy } from '@/services/ideasService'
import { addComment, fetchComments, fetchUserLikedCommentIds, toggleCommentLike } from '@/services/ideasService'
import { approveIdea, rejectIdea, fetchApprovedByManager, fetchRefinedByManager, moveToKnowledge } from '@/services/managementService'

// ── Dark-mode store ───────────────────────────────────────────────────────────
function subscribeDarkMode(cb: () => void) {
  window.addEventListener('ih:theme', cb)
  return () => window.removeEventListener('ih:theme', cb)
}
function getDarkModeSnapshot() {
  return localStorage.getItem('ih-dark-mode') === 'true'
}

// ── Theme ─────────────────────────────────────────────────────────────────────
type Theme = {
  pageBg: string; cardBg: string; cardShadow: string; cardShadowHover: string
  textPrimary: string; textSecondary: string; textMuted: string; divider: string
  sheetBg: string; sheetBorder: string; metaBlockBorder: string
  actionBg: string; actionColor: string; anonBg: string
}

const LIGHT: Theme = {
  pageBg: '#FDFAF4', cardBg: 'white',
  cardShadow: '0 2px 10px rgba(0,0,0,.08)', cardShadowHover: '0 8px 28px rgba(0,0,0,.15)',
  textPrimary: '#1e293b', textSecondary: '#64748b', textMuted: '#94a3b8', divider: '#e2e8f0',
  sheetBg: 'white', sheetBorder: '1px solid #e2e8f0', metaBlockBorder: '1px solid #e2e8f0',
  actionBg: '#f1f5f9', actionColor: '#64748b', anonBg: '#e2e8f0',
}
const DARK: Theme = {
  pageBg: '#0B1733', cardBg: '#0E1C3D',
  cardShadow: '0 2px 10px rgba(0,0,0,.4)', cardShadowHover: '0 8px 28px rgba(0,0,0,.6)',
  textPrimary: 'rgba(255,255,255,0.92)', textSecondary: 'rgba(255,255,255,0.65)', textMuted: 'rgba(255,255,255,0.38)', divider: 'rgba(255,255,255,0.08)',
  sheetBg: '#0E1C3D', sheetBorder: '1px solid rgba(255,255,255,0.08)', metaBlockBorder: '1px solid rgba(255,255,255,0.08)',
  actionBg: 'rgba(255,255,255,0.06)', actionColor: 'rgba(255,255,255,0.5)', anonBg: 'rgba(255,255,255,0.08)',
}

// ── Status colors (matches hub de ideias) ─────────────────────────────────────
type StatusD7 = { label: string; barColor: string; chipBg: string; chipText: string }
function getStatusD7(isDark: boolean): Record<IdeaStatus, StatusD7> {
  if (isDark) return {
    sugestao:         { label: 'Sugestão',        barColor: 'rgba(255,255,255,0.07)', chipBg: 'rgba(255,198,0,0.28)',  chipText: '#FFC600' },
    em_analise:       { label: 'Em Análise',       barColor: 'rgba(255,198,0,0.18)',   chipBg: 'rgba(255,198,0,0.28)',  chipText: '#FFC600' },
    em_implantacao:   { label: 'Em Implantação',   barColor: 'rgba(255,198,0,0.45)',   chipBg: 'rgba(255,198,0,0.28)',  chipText: '#FFC600' },
    conhecimento_org: { label: 'Gerou Valor',      barColor: '#C49600',                chipBg: 'rgba(255,198,0,0.28)',  chipText: '#FFC600' },
    em_refinamento:   { label: 'Não aprovada',      barColor: 'rgba(251,146,60,0.35)',  chipBg: 'rgba(251,146,60,0.20)', chipText: '#fb923c' },
  }
  return {
    sugestao:         { label: 'Sugestão',        barColor: '#e2e8f0', chipBg: '#dbeafe',           chipText: BLUE     },
    em_analise:       { label: 'Em Análise',       barColor: '#bfdbfe', chipBg: '#dbeafe',           chipText: BLUE     },
    em_implantacao:   { label: 'Em Implantação',   barColor: '#60a5fa', chipBg: '#dbeafe',           chipText: BLUE     },
    conhecimento_org: { label: 'Gerou Valor',      barColor: BLUE,      chipBg: '#dbeafe',           chipText: BLUE     },
    em_refinamento:   { label: 'Não aprovada',      barColor: 'rgba(234,88,12,0.3)', chipBg: 'rgba(251,146,60,0.10)', chipText: '#ea580c' },
  }
}

function authorInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
}

function scoreStyle(score: number, isDark: boolean): React.CSSProperties {
  if (isDark) {
    if (score >= 75) return { background: 'rgba(212,160,0,0.18)', color: '#D4A000' }
    if (score >= 50) return { background: 'rgba(251,191,36,0.12)', color: '#fbbf24' }
    return { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)' }
  }
  return { background: 'rgba(0,87,168,0.10)', color: BLUE }
}

function getPriorityStyle(className: string, isDark: boolean) {
  if (className === 'is-high') return { bg: isDark ? 'rgba(245,158,11,0.18)' : 'rgba(245,158,11,0.12)', color: '#f59e0b' }
  if (className === 'is-medium') return { bg: isDark ? 'rgba(59,130,246,0.18)' : 'rgba(59,130,246,0.10)', color: isDark ? '#93c5fd' : '#3b82f6' }
  return { bg: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', color: isDark ? 'rgba(255,255,255,0.38)' : '#94a3b8' }
}

const BLUE = '#0057A8'

type ViewTab = IdeaStatus | 'aprovados' | 'refinados'


const AREA_FILTERS: Array<{ value: ImprovementArea | null; label: string }> = [
  { value: null,        label: 'Todas'     },
  { value: 'processo',  label: 'Processo'  },
  { value: 'custo',     label: 'Custo'     },
  { value: 'seguranca', label: 'Segurança' },
  { value: 'qualidade', label: 'Qualidade' },
]

const SORT_OPTIONS: Array<{ value: SortBy; label: string }> = [
  { value: 'relevancia',    label: 'Relevância'       },
  { value: 'maior-score',   label: 'Maior Score'      },
  { value: 'mais-votados',  label: 'Mais validadas'   },
  { value: 'menos-votados', label: 'Menos validadas'  },
]

type ActionModal = { type: 'approve' | 'reject'; idea: IdeaListItem } | null
type Feedback    = { type: 'success' | 'error'; message: string } | null

// ── Page ──────────────────────────────────────────────────────────────────────
export default function HubGestorPage() {
  const { user, loading: userLoading } = useUser()
  const hook = useIdeas(user?.id)

  const [selectedStatus, setSelectedStatus] = useState<ViewTab>('em_analise')
  const [selectedArea,   setSelectedArea]   = useState<ImprovementArea | null>(null)
  const [sortBy,         setSortBy]         = useState<SortBy>('relevancia')
  const [searchText,     setSearchText]     = useState('')
  const [selectedIdea,   setSelectedIdea]   = useState<IdeaListItem | null>(null)
  const [actionModal,    setActionModal]    = useState<ActionModal>(null)
  const [approvedIdeas,  setApprovedIdeas]  = useState<IdeaListItem[]>([])
  const [loadingApproved, setLoadingApproved] = useState(false)
  const [refinedIdeas,   setRefinedIdeas]   = useState<IdeaListItem[]>([])
  const [loadingRefined, setLoadingRefined] = useState(false)
  const [rejectReason,   setRejectReason]   = useState('')
  const [submittingAction, setSubmittingAction] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [scoreInputMode, setScoreInputMode] = useState(false)
  const [secondarySearch, setSecondarySearch] = useState('')
  const [secondaryArea,   setSecondaryArea]   = useState<ImprovementArea | null>(null)
  const [secondarySort,   setSecondarySort]   = useState<'recente' | 'score' | 'validadas'>('recente')
  const [secondaryAreaOpen, setSecondaryAreaOpen] = useState(false)
  const [secondarySortOpen, setSecondarySortOpen] = useState(false)
  const secondaryAreaRef = useRef<HTMLDivElement>(null)
  const secondarySortRef = useRef<HTMLDivElement>(null)
  const [approvedStatusFilter, setApprovedStatusFilter] = useState<'em_implantacao' | 'conhecimento_org'>('em_implantacao')
  const [filtersReady, setFiltersReady] = useState(false)

  const debouncedSearch          = useDebounce(searchText, 300)
  const debouncedSecondarySearch = useDebounce(secondarySearch, 300)
  const isDark = useSyncExternalStore(subscribeDarkMode, getDarkModeSnapshot, () => false)
  const th = isDark ? DARK : LIGHT
  const accent = isDark ? '#FFC600' : BLUE

  const mainRef   = useRef<HTMLElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const [headerH,      setHeaderH]      = useState(0)
  const [headerHidden, setHeaderHidden] = useState(false)
  const [isMobile,     setIsMobile]     = useState(false)
  const lastScrollY = useRef(0)

  const [areaDropdownOpen, setAreaDropdownOpen] = useState(false)
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)
  const areaDropdownRef = useRef<HTMLDivElement>(null)
  const sortDropdownRef = useRef<HTMLDivElement>(null)

  const aiWeightPercent    = Math.round(hook.hybridWeights.ai * 100)
  const socialWeightPercent = 100 - aiWeightPercent
  const sectorId = user?.sector_id ?? undefined

  const areaButtonLabel = selectedArea !== null
    ? (AREA_FILTERS.find((o) => o.value === selectedArea)?.label ?? 'Todas') : 'Todas'
  const sortButtonLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? 'Relevância'
  const hasActiveFilters = selectedArea !== null || sortBy !== 'relevancia' || searchText !== '' || hook.hybridWeights.ai !== 0.7

  const filteredSecondaryIdeas = useMemo(() => {
    const source = selectedStatus === 'aprovados' ? approvedIdeas
      : selectedStatus === 'refinados' ? refinedIdeas
      : null
    if (source === null) return hook.ideas
    let result = [...source]
    if (selectedStatus === 'aprovados') {
      result = result.filter((i) => i.status === approvedStatusFilter)
    }
    if (debouncedSecondarySearch.trim()) {
      const q = debouncedSecondarySearch.toLowerCase()
      result = result.filter((i) =>
        i.title.toLowerCase().includes(q) || (i.summary ?? '').toLowerCase().includes(q)
      )
    }
    if (secondaryArea !== null) result = result.filter((i) => i.improvement_area === secondaryArea)
    if (secondarySort === 'score') {
      result.sort((a, b) => (b.hybrid_score ?? 0) - (a.hybrid_score ?? 0))
    } else if (secondarySort === 'validadas') {
      result.sort((a, b) => b.social_score - a.social_score)
    } else {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }
    return result
  }, [selectedStatus, approvedIdeas, refinedIdeas, hook.ideas, debouncedSecondarySearch, secondaryArea, secondarySort, approvedStatusFilter])

  const hasSecondaryFilters = secondarySearch !== '' || secondaryArea !== null || secondarySort !== 'recente'
  const displayedIdeas   = filteredSecondaryIdeas
  const displayedLoading = selectedStatus === 'aprovados' ? loadingApproved : selectedStatus === 'refinados' ? loadingRefined : hook.loading

  const metrics = useMemo(() => {
    const total    = hook.ideas.length
    const high     = hook.ideas.filter((i) => (i.hybrid_score ?? 0) >= 80).length
    const medium   = hook.ideas.filter((i) => { const s = i.hybrid_score ?? 0; return s >= 50 && s < 80 }).length
    const avgScore = total > 0
      ? Math.round(hook.ideas.reduce((sum, i) => sum + (i.hybrid_score ?? 0), 0) / total)
      : 0
    return { total, high, medium, avgScore }
  }, [hook.ideas])

  const lastFilterKey = useRef('')
  useEffect(() => {
    if (userLoading) return
    if (selectedStatus === 'aprovados' || selectedStatus === 'refinados') return
    if (hook.loading && !lastFilterKey.current) return
    const key = [sectorId ?? '', selectedStatus, selectedArea ?? '', sortBy, debouncedSearch].join('|')
    if (key === lastFilterKey.current) return
    lastFilterKey.current = key
    hook.setFilters({
      tab: sectorId ? 'para-voce' : 'global',
      sectorId,
      status: selectedStatus as IdeaStatus,
      area: selectedArea ?? undefined,
      search: debouncedSearch.trim() || undefined,
      sortBy,
      orderBy: undefined,
      improvementArea: undefined,
    })
    setFiltersReady(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectorId, userLoading, hook.loading, selectedArea, selectedStatus, sortBy, debouncedSearch])

  useEffect(() => {
    if (selectedStatus !== 'aprovados' || !user?.id) return
    setLoadingApproved(true)
    fetchApprovedByManager(user.id)
      .then(setApprovedIdeas)
      .catch(() => setApprovedIdeas([]))
      .finally(() => setLoadingApproved(false))
  }, [selectedStatus, user?.id])

  useEffect(() => {
    if (selectedStatus !== 'refinados' || !user?.id) return
    setLoadingRefined(true)
    fetchRefinedByManager(user.id)
      .then(setRefinedIdeas)
      .catch(() => setRefinedIdeas([]))
      .finally(() => setLoadingRefined(false))
  }, [selectedStatus, user?.id])

  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setHeaderH(el.offsetHeight))
    ro.observe(el)
    setHeaderH(el.offsetHeight)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const el = mainRef.current
    if (!el) return
    const onScroll = () => {
      const y = el.scrollTop
      if (Math.abs(y - lastScrollY.current) < 6) return
      setHeaderHidden(y > lastScrollY.current && y > 80)
      lastScrollY.current = y
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [isMobile])

  useEffect(() => {
    if (!areaDropdownOpen) return
    function h(e: MouseEvent) {
      if (areaDropdownRef.current && !areaDropdownRef.current.contains(e.target as Node)) setAreaDropdownOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [areaDropdownOpen])

  useEffect(() => {
    if (!sortDropdownOpen) return
    function h(e: MouseEvent) {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) setSortDropdownOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [sortDropdownOpen])

  useEffect(() => {
    if (!secondaryAreaOpen) return
    function h(e: MouseEvent) {
      if (secondaryAreaRef.current && !secondaryAreaRef.current.contains(e.target as Node)) setSecondaryAreaOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [secondaryAreaOpen])

  useEffect(() => {
    if (!secondarySortOpen) return
    function h(e: MouseEvent) {
      if (secondarySortRef.current && !secondarySortRef.current.contains(e.target as Node)) setSecondarySortOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [secondarySortOpen])

  if (userLoading) return <p className="ih-loading-page">Carregando...</p>

  function handleWeightChange(value: number) {
    hook.setHybridWeights({ ai: value / 100, social: 1 - value / 100 })
    setSortBy('maior-score')
  }

  function getCanManage(idea: IdeaListItem) {
    return idea.sector_id === user?.sector_id || user?.role === 'admin'
  }

  function openActionModal(type: 'approve' | 'reject', ideaId: string) {
    const idea = hook.ideas.find((i) => i.id === ideaId)
    if (!idea) return
    setRejectReason('')
    setFeedback(null)
    setActionModal({ type, idea })
  }

  async function handleActionSubmit() {
    if (!actionModal || !user?.id) return
    if (actionModal.type === 'reject' && !rejectReason.trim()) {
      setFeedback({ type: 'error', message: 'Informe uma justificativa para rejeitar a ideia.' })
      return
    }
    setSubmittingAction(true)
    setFeedback(null)
    try {
      if (actionModal.type === 'approve') {
        await approveIdea(actionModal.idea.id, user.id)
        setFeedback({ type: 'success', message: 'Ideia aprovada e enviada para implantação.' })
      }
      if (actionModal.type === 'reject') {
        await rejectIdea(actionModal.idea.id, user.id, rejectReason)
        setFeedback({ type: 'success', message: 'Rejeição registrada com justificativa.' })
      }
      setActionModal(null)
      setSelectedIdea(null)
      setRejectReason('')
      await hook.loadIdeas(hook.filters)
    } catch (error) {
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Erro ao executar ação.' })
    } finally {
      setSubmittingAction(false)
    }
  }

  async function handleMoveToKnowledge(ideaId: string) {
    if (!user?.id) return
    setSubmittingAction(true)
    setFeedback(null)
    try {
      await moveToKnowledge(ideaId, user.id)
      setApprovedIdeas((prev) => prev.map((i) => i.id === ideaId ? { ...i, status: 'conhecimento_org' as IdeaStatus } : i))
      if (selectedIdea?.id === ideaId) setSelectedIdea(null)
      setFeedback({ type: 'success', message: 'Ideia marcada como "Gerou Valor" com sucesso.' })
    } catch (error) {
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Erro ao atualizar status.' })
    } finally {
      setSubmittingAction(false)
    }
  }

  function clearFilters() {
    setSelectedStatus('em_analise')
    setSelectedArea(null)
    setSortBy('relevancia')
    setSearchText('')
    hook.setHybridWeights({ ai: 0.7, social: 0.3 })
  }

  const modalMeta = actionModal ? getIdeaStatusMeta(actionModal.idea.status) : null

  return (
    <ProfileShell
      profile="gestor"
      title="Triagem de Ideias"
      subtitle="Aprove, rejeite ou acompanhe as ideias em análise do seu setor"
      user={user}
      pageBodyClass="light-page"
      notifCount={3}
      noPadding
      mainRef={mainRef}
    >
      <div style={{ background: th.pageBg, minHeight: '100%' }}>

        {/* ── Sticky header ── */}
        <div style={{
          position: 'sticky',
          top: isMobile && headerH > 0 ? (headerHidden ? -headerH : 0) : 0,
          zIndex: 50,
          transition: isMobile ? 'top 0.26s ease' : undefined,
        }}>
          <div ref={headerRef} style={{ background: th.pageBg }}>
            <div style={{ maxWidth: 880, margin: '0 auto' }}>

              {/* Row 1: Setor + KPI chips + Minhas ações pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, borderBottom: `1px solid ${th.divider}`, padding: '0 24px', height: 48, overflow: 'hidden' }}>
                {/* Setor */}
                <Icon name="building" size={13} style={{ color: th.textMuted, flexShrink: 0 } as CSSProperties} />
                <span style={{ fontSize: 12, fontWeight: 600, color: th.textSecondary, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  Analise ideias do setor <strong style={{ color: th.textPrimary }}>{user?.sector_name ?? '—'}</strong>
                </span>

                {/* Spacer */}
                <div style={{ flex: 1 }} />

                {/* Aprovados por você */}
                <button
                  type="button"
                  onClick={() => setSelectedStatus(selectedStatus === 'aprovados' ? 'em_analise' : 'aprovados')}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 100, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0, border: `1.5px solid ${selectedStatus === 'aprovados' ? accent : (isDark ? 'rgba(255,255,255,0.15)' : '#e2e8f0')}`, background: selectedStatus === 'aprovados' ? (isDark ? 'rgba(255,198,0,0.12)' : 'rgba(0,87,168,0.08)') : 'transparent', color: selectedStatus === 'aprovados' ? accent : th.textSecondary, transition: 'all .15s' }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  Aprovados por você
                  {approvedIdeas.length > 0 && <span style={{ fontSize: 10, fontWeight: 800, background: isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9', color: th.textMuted, padding: '1px 6px', borderRadius: 100 }}>{approvedIdeas.length}</span>}
                </button>

                {/* Não aprovadas */}
                <button
                  type="button"
                  onClick={() => setSelectedStatus(selectedStatus === 'refinados' ? 'em_analise' : 'refinados')}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 100, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0, border: `1.5px solid ${selectedStatus === 'refinados' ? '#f97316' : (isDark ? 'rgba(255,255,255,0.15)' : '#e2e8f0')}`, background: selectedStatus === 'refinados' ? 'rgba(249,115,22,0.10)' : 'transparent', color: selectedStatus === 'refinados' ? '#f97316' : th.textSecondary, transition: 'all .15s' }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Não aprovadas
                  {refinedIdeas.length > 0 && <span style={{ fontSize: 10, fontWeight: 800, background: isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9', color: th.textMuted, padding: '1px 6px', borderRadius: 100 }}>{refinedIdeas.length}</span>}
                </button>
              </div>

              {/* Botão Voltar — aparece só quando aprovados/refinados está selecionado */}
              {(selectedStatus === 'aprovados' || selectedStatus === 'refinados') && (
                <div style={{ padding: '0 24px', height: 40, display: 'flex', alignItems: 'center', borderBottom: `1px solid ${th.divider}` }}>
                  <button
                    type="button"
                    onClick={() => setSelectedStatus('em_analise')}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: accent, padding: 0 }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                    Voltar ao feed de triagem
                  </button>
                </div>
              )}

              {/* Chips de status — só para aprovados */}
              {selectedStatus === 'aprovados' && (
                <div style={{ padding: '8px 24px', display: 'flex', alignItems: 'center', gap: 6, borderBottom: `1px solid ${th.divider}` }}>
                  {([
                    { value: 'em_implantacao',  label: 'Em Implantação' },
                    { value: 'conhecimento_org', label: 'Gerou Valor'    },
                  ] as const).map((opt) => {
                    const isActive = approvedStatusFilter === opt.value
                    const q2 = debouncedSecondarySearch.toLowerCase().trim()
                    const count = approvedIdeas.filter((i) => {
                      if (i.status !== opt.value) return false
                      if (q2 && !i.title.toLowerCase().includes(q2) && !(i.summary ?? '').toLowerCase().includes(q2)) return false
                      if (secondaryArea !== null && i.improvement_area !== secondaryArea) return false
                      return true
                    }).length
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setApprovedStatusFilter(opt.value)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '5px 12px', borderRadius: 100, fontSize: 12, fontWeight: 700,
                          cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0,
                          border: `1.5px solid ${isActive ? accent : (isDark ? 'rgba(255,255,255,0.15)' : '#e2e8f0')}`,
                          background: isActive ? (isDark ? 'rgba(255,198,0,0.12)' : 'rgba(0,87,168,0.08)') : 'transparent',
                          color: isActive ? accent : th.textSecondary,
                          transition: 'all .15s',
                        }}
                      >
                        {opt.label}
                        {count > 0 && (
                          <span style={{ fontSize: 10, fontWeight: 800, background: isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9', color: th.textMuted, padding: '1px 6px', borderRadius: 100 }}>
                            {count}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Filtros secundários — aprovados / não aprovadas */}
              {(selectedStatus === 'aprovados' || selectedStatus === 'refinados') && (
                <div style={{ padding: '10px 24px 12px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${th.divider}` }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: isDark ? '#D4A000' : BLUE, pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                      <Icon name="search" size={15} />
                    </span>
                    <input
                      type="search" placeholder="Buscar..." value={secondarySearch}
                      onChange={(e) => setSecondarySearch(e.target.value)} aria-label="Buscar"
                      style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: 10, border: isDark ? '1.5px solid rgba(255,255,255,0.12)' : '1.5px solid #e2e8f0', background: isDark ? 'rgba(255,255,255,0.04)' : 'white', fontSize: 13, outline: 'none', fontFamily: 'inherit', color: th.textPrimary, boxSizing: 'border-box' }}
                    />
                  </div>

                  <div ref={secondaryAreaRef} style={{ position: 'relative', flexShrink: 0 }}>
                    <button type="button" onClick={() => setSecondaryAreaOpen((p) => !p)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, border: `1.5px solid ${secondaryArea !== null ? accent : (isDark ? 'rgba(255,255,255,0.15)' : '#e2e8f0')}`, background: 'transparent', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
                      <span style={{ fontSize: 10, color: th.textMuted, fontWeight: 500 }}>Área</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: secondaryArea !== null ? accent : th.textPrimary }}>
                        {secondaryArea !== null ? (AREA_FILTERS.find((o) => o.value === secondaryArea)?.label ?? 'Todas') : 'Todas'}
                      </span>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: th.textMuted }}><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    {secondaryAreaOpen && (
                      <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: th.sheetBg, border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`, borderRadius: 10, boxShadow: isDark ? '0 8px 24px rgba(0,0,0,.5)' : '0 8px 24px rgba(0,0,0,.12)', zIndex: 200, minWidth: 170, overflow: 'hidden', padding: '4px 0' }}>
                        {AREA_FILTERS.map((opt) => {
                          const isSel = secondaryArea === opt.value
                          return <button key={opt.value ?? 'all'} type="button" onClick={() => { setSecondaryArea(opt.value); setSecondaryAreaOpen(false) }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 16px', fontSize: 13, fontWeight: isSel ? 700 : 400, background: isSel ? (isDark ? 'rgba(255,255,255,0.08)' : '#eff6ff') : 'transparent', color: isSel ? accent : th.textPrimary, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>{opt.label}</button>
                        })}
                      </div>
                    )}
                  </div>

                  <div ref={secondarySortRef} style={{ position: 'relative', flexShrink: 0 }}>
                    <button type="button" onClick={() => setSecondarySortOpen((p) => !p)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, border: `1.5px solid ${secondarySort !== 'recente' ? accent : (isDark ? 'rgba(255,255,255,0.15)' : '#e2e8f0')}`, background: 'transparent', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
                      <span style={{ fontSize: 10, color: th.textMuted, fontWeight: 500 }}>Ordenar</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: secondarySort !== 'recente' ? accent : th.textPrimary }}>
                        {secondarySort === 'score' ? 'Maior Score' : secondarySort === 'validadas' ? 'Mais validadas' : 'Mais recentes'}
                      </span>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: th.textMuted }}><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    {secondarySortOpen && (
                      <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: th.sheetBg, border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`, borderRadius: 10, boxShadow: isDark ? '0 8px 24px rgba(0,0,0,.5)' : '0 8px 24px rgba(0,0,0,.12)', zIndex: 200, minWidth: 160, overflow: 'hidden', padding: '4px 0' }}>
                        {([
                          { value: 'recente',   label: 'Mais recentes'  },
                          { value: 'score',     label: 'Maior Score'    },
                          { value: 'validadas', label: 'Mais validadas' },
                        ] as const).map((o) => {
                          const isSel = secondarySort === o.value
                          return <button key={o.value} type="button" onClick={() => { setSecondarySort(o.value); setSecondarySortOpen(false) }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 16px', fontSize: 13, fontWeight: isSel ? 700 : 400, background: isSel ? (isDark ? 'rgba(255,255,255,0.08)' : '#eff6ff') : 'transparent', color: isSel ? accent : th.textPrimary, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>{o.label}</button>
                        })}
                      </div>
                    )}
                  </div>

                  {hasSecondaryFilters && (
                    <button type="button"
                      onClick={() => { setSecondarySearch(''); setSecondaryArea(null); setSecondarySort('recente') }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0, padding: '4px 10px', borderRadius: 8, border: `1.5px solid ${isDark ? 'rgba(220,38,38,0.3)' : 'rgba(220,38,38,0.2)'}`, background: isDark ? 'rgba(220,38,38,0.08)' : 'rgba(220,38,38,0.05)', fontSize: 12, fontWeight: 600, color: isDark ? '#fca5a5' : '#dc2626', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                      <Icon name="x" size={11} />
                      Limpar
                    </button>
                  )}
                </div>
              )}

              {/* Filtros */}
              {selectedStatus !== 'aprovados' && selectedStatus !== 'refinados' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: '10px 24px 12px' }}>

                  {/* Linha 1: Busca + Área + Ordenar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: isDark ? '#D4A000' : BLUE, pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                        <Icon name="search" size={16} />
                      </span>
                      <input
                        type="search" placeholder="Buscar ideias..." value={searchText}
                        onChange={(e) => setSearchText(e.target.value)} aria-label="Buscar ideias"
                        style={{ width: '100%', padding: '11px 14px 11px 42px', borderRadius: 12, border: isDark ? '1.5px solid rgba(255,255,255,0.12)' : '1.5px solid #e2e8f0', background: isDark ? 'rgba(255,255,255,0.04)' : 'white', fontSize: 15, outline: 'none', fontFamily: 'inherit', color: th.textPrimary, boxSizing: 'border-box' }}
                      />
                    </div>

                    <div ref={areaDropdownRef} style={{ position: 'relative', flexShrink: 0 }}>
                      <button type="button" onClick={() => setAreaDropdownOpen((p) => !p)}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, border: `1.5px solid ${selectedArea !== null ? accent : (isDark ? 'rgba(255,255,255,0.15)' : '#e2e8f0')}`, background: 'transparent', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
                        <span style={{ fontSize: 10, color: th.textMuted, fontWeight: 500 }}>Área</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: selectedArea !== null ? accent : th.textPrimary }}>{areaButtonLabel}</span>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: th.textMuted }}><polyline points="6 9 12 15 18 9"/></svg>
                      </button>
                      {areaDropdownOpen && (
                        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: th.sheetBg, border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`, borderRadius: 10, boxShadow: isDark ? '0 8px 24px rgba(0,0,0,.5)' : '0 8px 24px rgba(0,0,0,.12)', zIndex: 200, minWidth: 170, overflow: 'hidden', padding: '4px 0' }}>
                          {AREA_FILTERS.map((opt) => {
                            const isSel = selectedArea === opt.value
                            return <button key={opt.value ?? 'all'} type="button" onClick={() => { setSelectedArea(opt.value); setAreaDropdownOpen(false) }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 16px', fontSize: 13, fontWeight: isSel ? 700 : 400, background: isSel ? (isDark ? 'rgba(255,255,255,0.08)' : '#eff6ff') : 'transparent', color: isSel ? accent : th.textPrimary, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>{opt.label}</button>
                          })}
                        </div>
                      )}
                    </div>

                    <div ref={sortDropdownRef} style={{ position: 'relative', flexShrink: 0 }}>
                      <button type="button" onClick={() => setSortDropdownOpen((p) => !p)}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, border: `1.5px solid ${sortBy !== 'relevancia' ? accent : (isDark ? 'rgba(255,255,255,0.15)' : '#e2e8f0')}`, background: 'transparent', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
                        <span style={{ fontSize: 10, color: th.textMuted, fontWeight: 500 }}>Ordenar</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: sortBy !== 'relevancia' ? accent : th.textPrimary }}>{sortButtonLabel}</span>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: th.textMuted }}><polyline points="6 9 12 15 18 9"/></svg>
                      </button>
                      {sortDropdownOpen && (
                        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: th.sheetBg, border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`, borderRadius: 10, boxShadow: isDark ? '0 8px 24px rgba(0,0,0,.5)' : '0 8px 24px rgba(0,0,0,.12)', zIndex: 200, minWidth: 200, overflow: 'hidden', padding: '4px 0' }}>
                          {SORT_OPTIONS.map((o) => {
                            const isSel = sortBy === o.value
                            return <button key={o.value} type="button" onClick={() => { setSortBy(o.value); setSortDropdownOpen(false) }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 16px', fontSize: 13, fontWeight: isSel ? 700 : 400, background: isSel ? (isDark ? 'rgba(255,255,255,0.08)' : '#eff6ff') : 'transparent', color: isSel ? accent : th.textPrimary, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>{o.label}</button>
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Linha 2: Score + Personalizar + Limpar Filtros */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: th.textMuted, textTransform: 'uppercase', letterSpacing: '.05em', whiteSpace: 'nowrap' }}>Peso do Score</span>

                    {scoreInputMode ? (
                      /* Modo de digitação */
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: accent, whiteSpace: 'nowrap' }}>
                          IA
                          <input
                            type="number" min={0} max={100} value={aiWeightPercent}
                            onChange={(e) => handleWeightChange(Math.min(100, Math.max(0, Number(e.target.value))))}
                            style={{ width: 52, padding: '3px 7px', borderRadius: 6, border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.18)' : '#e2e8f0'}`, background: isDark ? 'rgba(255,255,255,0.06)' : 'white', fontSize: 12, fontWeight: 800, color: accent, fontFamily: 'inherit', outline: 'none', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}
                          />
                          %
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: accent, whiteSpace: 'nowrap' }}>
                          Social
                          <input
                            type="number" min={0} max={100} value={socialWeightPercent}
                            onChange={(e) => handleWeightChange(Math.min(100, Math.max(0, 100 - Number(e.target.value))))}
                            style={{ width: 52, padding: '3px 7px', borderRadius: 6, border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.18)' : '#e2e8f0'}`, background: isDark ? 'rgba(255,255,255,0.06)' : 'white', fontSize: 12, fontWeight: 800, color: accent, fontFamily: 'inherit', outline: 'none', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}
                          />
                          %
                        </label>
                        <button type="button" onClick={() => setScoreInputMode(false)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 6, border: `1px solid ${isDark ? 'rgba(34,197,94,0.25)' : 'rgba(34,197,94,0.20)'}`, background: isDark ? 'rgba(34,197,94,0.12)' : 'rgba(34,197,94,0.08)', color: '#22c55e', cursor: 'pointer', flexShrink: 0 }}>
                          <Icon name="check" size={12} />
                        </button>
                      </div>
                    ) : (
                      /* Modo slider */
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: accent, minWidth: 36, textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>IA {aiWeightPercent}%</span>
                        <input className="manager-hub-range" type="range" min={0} max={100} value={aiWeightPercent} onChange={(e) => handleWeightChange(Number(e.target.value))} aria-label="Peso do AI Score no Score Híbrido" style={{ width: 180 }} />
                        <span style={{ fontSize: 10, fontWeight: 800, color: accent, minWidth: 52, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>Social {socialWeightPercent}%</span>
                      </div>
                    )}

                    {/* Botão personalizar */}
                    <button
                      type="button"
                      onClick={() => setScoreInputMode((p) => !p)}
                      title="Personalizar pesos manualmente"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 7, border: `1.5px solid ${scoreInputMode ? accent : (isDark ? 'rgba(255,255,255,0.15)' : '#e2e8f0')}`, background: scoreInputMode ? (isDark ? `${accent}18` : `${accent}10`) : 'transparent', color: scoreInputMode ? accent : th.textMuted, cursor: 'pointer', flexShrink: 0, transition: 'all .15s' }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>

                    <div style={{ width: 1, height: 16, background: th.divider, flexShrink: 0, visibility: hasActiveFilters ? 'visible' : 'hidden' }} />
                    <button
                      type="button"
                      onClick={clearFilters}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0, padding: '4px 10px', borderRadius: 8, border: `1.5px solid ${isDark ? 'rgba(220,38,38,0.3)' : 'rgba(220,38,38,0.2)'}`, background: isDark ? 'rgba(220,38,38,0.08)' : 'rgba(220,38,38,0.05)', fontSize: 12, fontWeight: 600, color: isDark ? '#fca5a5' : '#dc2626', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', visibility: hasActiveFilters ? 'visible' : 'hidden' }}
                    >
                      <Icon name="x" size={11} />
                      Limpar Filtros
                    </button>
                  </div>

                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Feed ── */}
        <div style={{ maxWidth: 880, margin: '0 auto', padding: '20px 24px 80px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* KPIs */}
          {selectedStatus !== 'aprovados' && selectedStatus !== 'refinados' && filtersReady && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              <MetricCard label="Em análise"        value={metrics.total}    icon="layers"      color={accent}                          isDark={isDark} tooltip="Total de ideias aguardando decisão na fila atual" />
              <MetricCard label="Alta prioridade"   value={metrics.high}     icon="trending-up" color="#f59e0b"                         isDark={isDark} tooltip="Ideias com score híbrido ≥ 80 — requerem atenção urgente" />
              <MetricCard label="Média prioridade"  value={metrics.medium}   icon="bar-chart"   color={isDark ? '#A8C2F0' : '#0057a8'} isDark={isDark} tooltip="Ideias com score híbrido entre 50 e 79" />
              <MetricCard label="Score médio"       value={metrics.avgScore} icon="sparkles"    color="#22c55e"                         isDark={isDark} tooltip="Média do score híbrido do lote — indica a qualidade geral das ideias" />
            </div>
          )}

          {(feedback || hook.error) && (
            <div className={`ih-feedback ih-feedback-${feedback?.type ?? 'error'}`}>
              {feedback?.message ?? hook.error}
            </div>
          )}

          {!filtersReady || displayedLoading ? (
            <p className="ih-loading-page" style={{ minHeight: 280 }}>Carregando ideias...</p>
          ) : displayedIdeas.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: th.textMuted, fontSize: 14, background: th.cardBg, borderRadius: 18, boxShadow: th.cardShadow }}>
              {selectedStatus === 'aprovados'
                ? (approvedIdeas.length === 0 ? 'Você ainda não aprovou nenhuma ideia.' : 'Nenhuma ideia encontrada para os filtros selecionados.')
                : selectedStatus === 'refinados'
                ? (refinedIdeas.length === 0 ? 'Nenhuma ideia não aprovada ainda.' : 'Nenhuma ideia encontrada para os filtros selecionados.')
                : 'Nenhuma ideia encontrada. Ajuste os filtros para ampliar a fila.'}
            </div>
          ) : (
            displayedIdeas.map((idea) => (
              <ManagerIdeaCard
                key={idea.id}
                idea={idea}
                canManage={getCanManage(idea)}
                hybridWeights={hook.hybridWeights}
                isDark={isDark}
                th={th}
                onClick={() => setSelectedIdea(idea)}
                onApprove={(id) => openActionModal('approve', id)}
                onReject={(id) => openActionModal('reject', id)}
                onMoveToKnowledge={selectedStatus === 'aprovados' && approvedStatusFilter === 'em_implantacao' ? handleMoveToKnowledge : undefined}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Idea detail modal ── */}
      {selectedIdea && (
        <IdeaDetailModal
          idea={
            selectedStatus === 'aprovados'
              ? (approvedIdeas.find((i) => i.id === selectedIdea.id) ?? selectedIdea)
              : selectedStatus === 'refinados'
              ? (refinedIdeas.find((i) => i.id === selectedIdea.id) ?? selectedIdea)
              : (hook.ideas.find((i) => i.id === selectedIdea.id) ?? selectedIdea)
          }
          canManage={getCanManage(selectedIdea)}
          userId={user?.id ?? ''}
          hybridWeights={hook.hybridWeights}
          isDark={isDark}
          th={th}
          onClose={() => setSelectedIdea(null)}
          onApprove={(id) => openActionModal('approve', id)}
          onReject={(id) => openActionModal('reject', id)}
          onMoveToKnowledge={selectedStatus === 'aprovados' && approvedStatusFilter === 'em_implantacao' ? handleMoveToKnowledge : undefined}
        />
      )}

      {/* ── Action confirmation modal ── */}
      {actionModal && modalMeta && (
        <div className="ih-modal-backdrop" onClick={() => !submittingAction && setActionModal(null)}>
          <div className="ih-modal manager-hub-action-modal" onClick={(e) => e.stopPropagation()}>
            <div className="card-p">
              <div className="manager-hub-modal-kicker">
                <span className={`badge ${modalMeta.badge}`}>{modalMeta.label}</span>
                <span>{getImprovementAreaLabel(actionModal.idea.improvement_area)}</span>
                <button type="button" disabled={submittingAction} onClick={() => setActionModal(null)} aria-label="Fechar"
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: '2px 4px', borderRadius: 6, display: 'flex', alignItems: 'center', fontSize: 18, lineHeight: 1 }}>
                  ✕
                </button>
              </div>
              <h2>
                {actionModal.type === 'approve' ? 'Confirmar aprovação' : 'Registrar rejeição'}
              </h2>
              <p>{actionModal.idea.title}</p>
              <div className="manager-hub-modal-summary">
                <div><span>AI Score</span><strong>{actionModal.idea.ai_score}</strong></div>
                <div><span>Social</span><strong>{actionModal.idea.social_score}</strong></div>
                <div><span>Híbrido</span><strong>{actionModal.idea.hybrid_score ?? 0}</strong></div>
              </div>
              {actionModal.type === 'approve' ? (
                <div className="manager-hub-action-note">A ideia seguirá para Em implantação e o autor passará a aparecer publicamente.</div>
              ) : (
                <label className="manager-hub-field">
                  <span>Justificativa</span>
                  <textarea className="ih-textarea" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Informe a justificativa obrigatória..." />
                </label>
              )}
              {feedback && (
                <div className={`ih-feedback ih-feedback-${feedback.type}`} style={{ marginTop: 12 }}>{feedback.message}</div>
              )}
              <div className="manager-hub-modal-actions">
                <button className="btn btn-muted btn-md" type="button" disabled={submittingAction} onClick={() => setActionModal(null)}>Cancelar</button>
                <button
                  className={`btn btn-md ${actionModal.type === 'reject' ? 'btn-danger' : 'btn-primary'}`}
                  type="button"
                  disabled={submittingAction || (actionModal.type === 'reject' && !rejectReason.trim())}
                  onClick={handleActionSubmit}
                >
                  <Icon name={actionModal.type === 'reject' ? 'x' : 'check'} size={16} />
                  {submittingAction ? 'Processando...' : actionModal.type === 'approve' ? 'Aprovar' : 'Rejeitar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ProfileShell>
  )
}

// ── Card (D7-style) ───────────────────────────────────────────────────────────
function ManagerIdeaCard({
  idea, canManage, hybridWeights, isDark, th,
  onClick, onApprove, onReject, onMoveToKnowledge,
}: {
  idea: IdeaListItem
  canManage: boolean
  hybridWeights: { ai: number; social: number }
  isDark: boolean
  th: Theme
  onClick: () => void
  onApprove: (id: string) => void
  onReject: (id: string) => void
  onMoveToKnowledge?: (id: string) => void
}) {
  const d7 = getStatusD7(isDark)[idea.status]
  const isActionable = canManage && idea.status === 'em_analise'
  const priorityMeta = getPriorityMeta(idea.hybrid_score ?? 0)
  const priorityStyle = getPriorityStyle(priorityMeta.className, isDark)
  const hybridScore = Math.round(idea.ai_score * hybridWeights.ai + idea.social_score * hybridWeights.social)
  const authorRevealed = idea.status === 'em_implantacao' || idea.status === 'conhecimento_org'

  return (
    <article
      role="article"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
      style={{
        background: th.cardBg,
        borderRadius: 18,
        overflow: 'hidden',
        boxShadow: th.cardShadow,
        cursor: 'pointer',
        transition: 'box-shadow .15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = th.cardShadowHover }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = th.cardShadow }}
    >
      {/* Status color bar */}
      <div style={{ height: 5, background: d7.barColor }} />

      <div style={{ padding: '20px 24px' }}>
        {/* Row 1: author + sector/area + priority + status chip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
          {authorRevealed ? (
            <>
              <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, background: '#1d4ed8', color: 'white', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {authorInitials(idea.author_name)}
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: th.textSecondary }}>{idea.author_name}</span>
            </>
          ) : (
            <span style={{ color: isDark ? '#D4A000' : BLUE, display: 'flex', alignItems: 'center' }}>
              <Icon name="lock" size={13} />
            </span>
          )}
          <span style={{ fontSize: 13, color: th.textMuted }}>
            <span style={{ opacity: 0.65 }}>Setor:</span>{' '}{idea.sector_name}
            <span style={{ opacity: 0.45, margin: '0 5px' }}>·</span>
            {getImprovementAreaLabel(idea.improvement_area)}
          </span>
          <span style={{ marginLeft: 'auto', padding: '2px 9px', borderRadius: 100, fontSize: 10, fontWeight: 700, background: priorityStyle.bg, color: priorityStyle.color, flexShrink: 0 }}>
            {priorityMeta.label}
          </span>
          <span style={{ padding: '2px 9px', borderRadius: 100, fontSize: 10, fontWeight: 700, background: d7.chipBg, color: d7.chipText, flexShrink: 0 }}>
            {d7.label}
          </span>
        </div>

        {/* Title + date */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
          <h3 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: th.textPrimary, lineHeight: 1.35, flex: 1, wordBreak: 'break-word' }}>
            {idea.title}
          </h3>
          <span style={{ fontSize: 11, color: th.textMuted, flexShrink: 0, marginTop: 4 }}>
            {formatIdeaDate(idea.created_at)}
          </span>
        </div>

        {/* Summary */}
        {idea.summary && (
          <p style={{ margin: '0 0 18px', fontSize: 14, color: th.textSecondary, lineHeight: 1.65, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {idea.summary}
          </p>
        )}

        {/* Action row */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }} onClick={(e) => e.stopPropagation()}>
          {/* Approve + Reject quick buttons */}
          {isActionable && (
            <>
              <button type="button" onClick={() => onApprove(idea.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, height: 34, padding: '0 14px', background: isDark ? 'rgba(34,197,94,0.12)' : 'rgba(34,197,94,0.08)', color: '#22c55e', border: `1px solid ${isDark ? 'rgba(34,197,94,0.25)' : 'rgba(34,197,94,0.20)'}`, borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                <Icon name="check" size={14} />
                Aprovar
              </button>
              <button type="button" onClick={() => onReject(idea.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, height: 34, padding: '0 14px', background: isDark ? 'rgba(220,38,38,0.12)' : 'rgba(220,38,38,0.06)', color: '#dc2626', border: `1px solid ${isDark ? 'rgba(220,38,38,0.25)' : 'rgba(220,38,38,0.15)'}`, borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                <Icon name="x" size={14} />
                Rejeitar
              </button>
            </>
          )}
          {canManage && idea.status === 'em_implantacao' && onMoveToKnowledge && (
            <button type="button" onClick={() => onMoveToKnowledge(idea.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, height: 34, padding: '0 14px', background: isDark ? 'rgba(255,198,0,0.12)' : 'rgba(0,87,168,0.08)', color: isDark ? '#FFC600' : BLUE, border: `1px solid ${isDark ? 'rgba(255,198,0,0.25)' : 'rgba(0,87,168,0.20)'}`, borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              Gerou Valor
            </button>
          )}

          {/* Comment count */}
          <button
            type="button"
            onClick={onClick}
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 12px', background: th.actionBg, color: th.actionColor, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
            </svg>
            {idea.comment_count > 0 ? idea.comment_count : 0}
          </button>

          {/* Score pills */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 10px', borderRadius: 8, background: isDark ? 'rgba(168,194,240,0.12)' : 'rgba(0,87,168,0.07)' }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: isDark ? 'rgba(168,194,240,0.7)' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '.05em', lineHeight: 1, marginBottom: 2 }}>IA</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: isDark ? '#A8C2F0' : BLUE, lineHeight: 1 }}>{idea.ai_score}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 10px', borderRadius: 8, background: isDark ? 'rgba(255,198,0,0.10)' : 'rgba(245,158,11,0.08)' }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: isDark ? 'rgba(255,198,0,0.6)' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '.05em', lineHeight: 1, marginBottom: 2 }}>Social</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: isDark ? '#FFC600' : '#f59e0b', lineHeight: 1 }}>{idea.social_score}</span>
            </div>
            <div style={{ width: 1, height: 28, background: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 10px', borderRadius: 8, ...scoreStyle(hybridScore, isDark) }}>
              <span style={{ fontSize: 9, fontWeight: 700, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '.05em', lineHeight: 1, marginBottom: 2 }}>Híbrido</span>
              <span style={{ fontSize: 15, fontWeight: 800, lineHeight: 1 }}>{hybridScore}</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}

// ── Idea detail modal ─────────────────────────────────────────────────────────
function IdeaDetailModal({
  idea, canManage, userId, hybridWeights, isDark, th,
  onClose, onApprove, onReject, onMoveToKnowledge,
}: {
  idea: IdeaListItem
  canManage: boolean
  userId: string
  hybridWeights: { ai: number; social: number }
  isDark: boolean
  th: Theme
  onClose: () => void
  onApprove: (id: string) => void
  onReject: (id: string) => void
  onMoveToKnowledge?: (id: string) => void
}) {
  const d7 = getStatusD7(isDark)[idea.status]
  const isActionable = canManage && idea.status === 'em_analise'
  const priorityMeta = getPriorityMeta(idea.hybrid_score ?? 0)
  const priorityStyle = getPriorityStyle(priorityMeta.className, isDark)
  const hybridScore = Math.round(idea.ai_score * hybridWeights.ai + idea.social_score * hybridWeights.social)
  const authorRevealed = idea.status === 'em_implantacao' || idea.status === 'conhecimento_org'
  const accent = isDark ? '#FFC600' : BLUE

  const [comments,     setComments]     = useState<IdeaComment[]>(idea.comments ?? [])
  const [commentText,  setCommentText]  = useState('')
  const [submitting,   setSubmitting]   = useState(false)
  const [replyingTo,   setReplyingTo]   = useState<string | null>(null)
  const [replyTexts,   setReplyTexts]   = useState<Record<string, string>>({})
  const [replySubmitting, setReplySubmitting] = useState<Record<string, boolean>>({})
  const [likedCommentIds, setLikedCommentIds] = useState<Set<string>>(new Set())
  const [openReplies,  setOpenReplies]  = useState<Set<string>>(new Set())

  useEffect(() => { fetchComments(idea.id).then(setComments).catch(() => {}) }, [idea.id])
  useEffect(() => {
    if (!userId) return
    fetchUserLikedCommentIds(userId, idea.id).then((ids) => setLikedCommentIds(new Set(ids))).catch(() => {})
  }, [userId, idea.id])

  function toggleReplies(id: string) {
    setOpenReplies((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }

  function insertReply(tree: IdeaComment[], parentId: string, reply: IdeaComment): IdeaComment[] {
    return tree.map((c) => {
      if (c.id === parentId) return { ...c, replies: [...c.replies, reply] }
      if (c.replies.length) return { ...c, replies: insertReply(c.replies, parentId, reply) }
      return c
    })
  }

  function updateLikeCount(tree: IdeaComment[], commentId: string, delta: number): IdeaComment[] {
    return tree.map((c) => {
      if (c.id === commentId) return { ...c, like_count: Math.max(0, c.like_count + delta) }
      if (c.replies.length) return { ...c, replies: updateLikeCount(c.replies, commentId, delta) }
      return c
    })
  }

  async function handleToggleLike(commentId: string) {
    const isLiked = likedCommentIds.has(commentId)
    const delta = isLiked ? -1 : 1
    setLikedCommentIds((prev) => { const n = new Set(prev); if (isLiked) { n.delete(commentId) } else { n.add(commentId) }; return n })
    setComments((prev) => updateLikeCount(prev, commentId, delta))
    try {
      await toggleCommentLike(commentId, userId)
    } catch {
      setLikedCommentIds((prev) => { const n = new Set(prev); if (isLiked) { n.add(commentId) } else { n.delete(commentId) }; return n })
      setComments((prev) => updateLikeCount(prev, commentId, -delta))
    }
  }

  async function handleSubmitReply(parentId: string) {
    const text = replyTexts[parentId]?.trim()
    if (!text || !userId) return
    setReplySubmitting((prev) => ({ ...prev, [parentId]: true }))
    try {
      const reply = await addComment(idea.id, userId, text, parentId)
      setComments((prev) => insertReply(prev, parentId, reply))
      setReplyTexts((prev) => ({ ...prev, [parentId]: '' }))
      setReplyingTo(null)
    } catch { /* silent */ } finally {
      setReplySubmitting((prev) => ({ ...prev, [parentId]: false }))
    }
  }

  async function handleSubmitComment() {
    if (!commentText.trim() || !userId) return
    setSubmitting(true)
    try {
      const c = await addComment(idea.id, userId, commentText)
      setComments((prev) => [...prev, c])
      setCommentText('')
    } catch { /* silent */ } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500 }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.45)' }} onClick={onClose} />

      <div
        style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          width: 'min(780px, 92vw)', maxHeight: '88vh',
          background: th.sheetBg, overflow: 'hidden',
          borderRadius: 18, boxShadow: '0 24px 80px rgba(0,0,0,.28)',
          display: 'flex', flexDirection: 'column',
          border: isDark ? th.sheetBorder : 'none',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ background: th.sheetBg, flexShrink: 0, padding: '14px 20px', borderBottom: th.sheetBorder, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {authorRevealed ? (
              <>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#1d4ed8', color: 'white', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {authorInitials(idea.author_name)}
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: th.textPrimary }}>{idea.author_name}</span>
              </>
            ) : (
              <>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: th.anonBg, color: isDark ? '#D4A000' : BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="lock" size={16} />
                </div>
                <span style={{ fontSize: 13, color: th.textMuted }}>Autor anônimo</span>
              </>
            )}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ padding: '3px 10px', borderRadius: 100, fontSize: 10, fontWeight: 700, background: d7.chipBg, color: d7.chipText }}>{d7.label}</span>
            <span style={{ padding: '3px 10px', borderRadius: 100, fontSize: 10, fontWeight: 700, background: priorityStyle.bg, color: priorityStyle.color }}>
              Prioridade {priorityMeta.label}
            </span>
            <button type="button" onClick={onClose} aria-label="Fechar"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: th.textMuted, padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center', fontSize: 18, lineHeight: 1 }}>
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <div style={{ height: 5, background: d7.barColor }} />

          {/* Idea content */}
          <div style={{ padding: '20px 20px 0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: th.textMuted, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
              {getImprovementAreaLabel(idea.improvement_area)} · {idea.sector_name}
            </div>
            <h2 style={{ margin: '0 0 14px', fontSize: 22, fontWeight: 800, color: th.textPrimary, lineHeight: 1.3 }}>
              {idea.title}
            </h2>
            {idea.summary && (
              <p style={{ margin: '0 0 18px', fontSize: 15, color: th.textSecondary, lineHeight: 1.7 }}>
                {idea.summary}
              </p>
            )}
            {idea.benefits && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: th.textMuted, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Benefícios</div>
                <p style={{ margin: 0, fontSize: 14, color: th.textSecondary, lineHeight: 1.7 }}>{idea.benefits}</p>
              </div>
            )}

            {/* Meta grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
              <div style={{ border: th.metaBlockBorder, borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: th.textMuted, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Complexidade</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: th.textPrimary }}>{idea.complexity ?? '—'}</div>
              </div>
              <div style={{ border: th.metaBlockBorder, borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: th.textMuted, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Criado em</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: th.textPrimary }}>{formatIdeaDate(idea.created_at)}</div>
              </div>
            </div>

            {/* Score block */}
            <div style={{ border: th.metaBlockBorder, borderRadius: 12, padding: '14px 18px', marginBottom: 18, display: 'flex', gap: 28, alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: th.textMuted, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>AI Score</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: isDark ? '#A8C2F0' : BLUE }}>{idea.ai_score}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: th.textMuted, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Social Score</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: isDark ? '#FFC600' : '#f59e0b' }}>{idea.social_score}</div>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: th.textMuted, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6, textAlign: 'right' }}>Score Híbrido</div>
                <div style={{ fontSize: 26, fontWeight: 800, padding: '4px 14px', borderRadius: 8, ...scoreStyle(hybridScore, isDark) }}>{hybridScore}</div>
              </div>
            </div>

            {/* Manager decision */}
            {isActionable && (
              <div style={{ border: `1.5px solid ${isDark ? 'rgba(255,198,0,0.18)' : 'rgba(0,87,168,0.14)'}`, borderRadius: 12, padding: '16px 18px', marginBottom: 20, background: isDark ? 'rgba(255,198,0,0.03)' : 'rgba(0,87,168,0.02)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: th.textMuted, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>Decisão do gestor</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" onClick={() => onApprove(idea.id)}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, height: 42, borderRadius: 10, fontSize: 14, fontWeight: 700, background: isDark ? 'rgba(34,197,94,0.12)' : 'rgba(34,197,94,0.08)', color: '#22c55e', border: `1.5px solid ${isDark ? 'rgba(34,197,94,0.25)' : 'rgba(34,197,94,0.20)'}`, cursor: 'pointer', fontFamily: 'inherit' }}>
                    <Icon name="check" size={15} />
                    Aprovar ideia
                  </button>
                  <button type="button" onClick={() => onReject(idea.id)}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, height: 42, borderRadius: 10, fontSize: 14, fontWeight: 700, background: isDark ? 'rgba(220,38,38,0.12)' : 'rgba(220,38,38,0.06)', color: '#dc2626', border: `1.5px solid ${isDark ? 'rgba(220,38,38,0.25)' : 'rgba(220,38,38,0.15)'}`, cursor: 'pointer', fontFamily: 'inherit' }}>
                    <Icon name="x" size={15} />
                    Rejeitar ideia
                  </button>
                </div>
              </div>
            )}
            {/* Gerou Valor — só aparece para ideias em_implantacao na aba aprovados */}
            {canManage && idea.status === 'em_implantacao' && onMoveToKnowledge && (
              <div style={{ border: `1.5px solid ${isDark ? 'rgba(255,198,0,0.18)' : 'rgba(0,87,168,0.14)'}`, borderRadius: 12, padding: '16px 18px', marginBottom: 20, background: isDark ? 'rgba(255,198,0,0.03)' : 'rgba(0,87,168,0.02)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: th.textMuted, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Atualizar status</div>
                <p style={{ margin: '0 0 12px', fontSize: 13, color: th.textSecondary, lineHeight: 1.55 }}>
                  Esta ideia foi implementada e gerou resultado real para a empresa? Registre como <strong>Gerou Valor</strong>.
                </p>
                <button type="button" onClick={() => onMoveToKnowledge(idea.id)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 42, borderRadius: 10, fontSize: 14, fontWeight: 700, background: isDark ? 'rgba(255,198,0,0.12)' : 'rgba(0,87,168,0.08)', color: isDark ? '#FFC600' : BLUE, border: `1.5px solid ${isDark ? 'rgba(255,198,0,0.25)' : 'rgba(0,87,168,0.20)'}`, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                  Marcar como Gerou Valor
                </button>
              </div>
            )}
          </div>

          {/* Comment input — sticky */}
          <div style={{ position: 'sticky', top: 0, zIndex: 100, background: th.sheetBg, borderTop: th.sheetBorder, borderBottom: th.sheetBorder, padding: '14px 20px' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Adicione um comentário..."
                rows={2}
                style={{ flex: 1, border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#e2e8f0'}`, borderRadius: 8, padding: '8px 12px', fontSize: 13, fontFamily: 'inherit', resize: 'none', outline: 'none', minHeight: 60, background: isDark ? 'rgba(255,255,255,0.04)' : 'white', color: th.textPrimary, transition: 'border-color .15s' }}
                onFocus={(e) => { e.target.style.borderColor = accent }}
                onBlur={(e) => { e.target.style.borderColor = isDark ? 'rgba(255,255,255,0.12)' : '#e2e8f0' }}
              />
              <button
                type="button"
                disabled={!commentText.trim() || submitting}
                onClick={handleSubmitComment}
                style={{ background: accent, color: isDark ? '#0B1733' : 'white', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: !commentText.trim() || submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: !commentText.trim() || submitting ? 0.5 : 1, transition: 'opacity .12s' }}
              >
                {submitting ? '...' : 'Enviar'}
              </button>
            </div>
          </div>

          {/* Comments */}
          <div style={{ padding: '16px 20px 24px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: th.textMuted, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>
              Comentários{comments.length > 0 && ` (${comments.length})`}
            </div>
            {comments.length === 0 ? (
              <div style={{ fontSize: 13, color: th.textMuted }}>Nenhum comentário ainda.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {comments.map((c, idx) => (
                  <Fragment key={c.id}>
                    {idx > 0 && <div style={{ height: 1, background: isDark ? 'rgba(255,255,255,0.06)' : '#f0f4f8', margin: '12px 0' }} />}
                    <CommentNode
                      comment={c}
                      depth={0}
                      userId={userId}
                      likedCommentIds={likedCommentIds}
                      openReplies={openReplies}
                      onToggleReplies={toggleReplies}
                      replyingTo={replyingTo}
                      replyTexts={replyTexts}
                      replySubmitting={replySubmitting}
                      onToggleLike={handleToggleLike}
                      onReply={(id) => setReplyingTo(replyingTo === id ? null : id)}
                      onReplyTextChange={(id, val) => setReplyTexts((p) => ({ ...p, [id]: val }))}
                      onSubmitReply={handleSubmitReply}
                      isDark={isDark}
                      th={th}
                    />
                  </Fragment>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 24px', borderTop: th.sheetBorder, background: th.sheetBg, flexShrink: 0 }}>
          <div style={{ marginLeft: 'auto', fontSize: 15, fontWeight: 800, padding: '6px 14px', borderRadius: 8, ...scoreStyle(hybridScore, isDark) }}>
            Score: {hybridScore}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Comment node (recursive) ──────────────────────────────────────────────────
function CommentNode({
  comment, depth, userId, likedCommentIds, openReplies, onToggleReplies,
  replyingTo, replyTexts, replySubmitting,
  onToggleLike, onReply, onReplyTextChange, onSubmitReply, isDark, th,
}: {
  comment: IdeaComment
  depth: number
  userId: string
  likedCommentIds: Set<string>
  openReplies: Set<string>
  onToggleReplies: (id: string) => void
  replyingTo: string | null
  replyTexts: Record<string, string>
  replySubmitting: Record<string, boolean>
  onToggleLike: (id: string) => void
  onReply: (id: string) => void
  onReplyTextChange: (id: string, val: string) => void
  onSubmitReply: (parentId: string) => void
  isDark: boolean
  th: Theme
}) {
  const repliesOpen  = openReplies.has(comment.id)
  const isLiked      = likedCommentIds.has(comment.id)
  const isReplying   = replyingTo === comment.id
  const accentColor  = isDark ? '#FFC600' : BLUE
  const lineColor    = isDark ? 'rgba(255,255,255,0.10)' : '#e2e8f0'
  const showReplies  = depth > 0 || repliesOpen

  return (
    <div>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: isDark ? 'rgba(255,255,255,0.10)' : BLUE, color: isDark ? 'rgba(255,255,255,0.80)' : 'white', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {comment.author_name ? authorInitials(comment.author_name) : '?'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: th.textPrimary }}>{comment.author_name}</span>
            <span style={{ fontSize: 10, color: th.textMuted }}>{formatIdeaDate(comment.created_at)}</span>
          </div>
          <div style={{ fontSize: 13, color: th.textSecondary, lineHeight: 1.5, wordBreak: 'break-word' }}>{comment.content}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
            {/* Like */}
            <button type="button" onClick={() => onToggleLike(comment.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 12, fontWeight: 600, color: isLiked ? accentColor : th.textMuted, transition: 'color .12s' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              {comment.like_count > 0 && comment.like_count}
            </button>
            {/* Reply */}
            <button type="button" onClick={() => onReply(comment.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 12, fontWeight: 600, color: isReplying ? accentColor : th.textMuted, transition: 'color .12s' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
              Responder
            </button>
            {/* Toggle replies */}
            {depth === 0 && comment.replies.length > 0 && (
              <button type="button" onClick={() => onToggleReplies(comment.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 12, fontWeight: 700, color: accentColor, fontFamily: 'inherit', transition: 'color .12s' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform .2s', transform: repliesOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
                {repliesOpen ? 'Ocultar respostas' : `Ver ${comment.replies.length} resposta${comment.replies.length !== 1 ? 's' : ''}`}
              </button>
            )}
          </div>
          {/* Reply input */}
          {isReplying && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'flex-start' }}>
              <textarea
                value={replyTexts[comment.id] ?? ''}
                onChange={(e) => onReplyTextChange(comment.id, e.target.value)}
                placeholder={`Respondendo ${comment.author_name}…`}
                rows={2}
                style={{ flex: 1, resize: 'none', fontSize: 13, padding: '8px 12px', borderRadius: 8, border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#e2e8f0'}`, background: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc', color: th.textPrimary, fontFamily: 'inherit', outline: 'none' }}
              />
              <button
                type="button"
                disabled={!replyTexts[comment.id]?.trim() || replySubmitting[comment.id]}
                onClick={() => onSubmitReply(comment.id)}
                style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: accentColor, color: isDark ? '#0B1733' : 'white', border: 'none', cursor: 'pointer', flexShrink: 0, opacity: !replyTexts[comment.id]?.trim() || replySubmitting[comment.id] ? 0.5 : 1 }}
              >
                {replySubmitting[comment.id] ? '…' : 'Enviar'}
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Nested replies */}
      {comment.replies.length > 0 && showReplies && (
        <div style={{ marginTop: 8, marginLeft: 14, paddingLeft: 22, ...(comment.replies.length > 1 ? { borderLeft: `1.5px solid ${lineColor}` } : {}), display: 'flex', flexDirection: 'column', gap: 10 }}>
          {comment.replies.map((reply) => (
            <CommentNode
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              userId={userId}
              likedCommentIds={likedCommentIds}
              openReplies={openReplies}
              onToggleReplies={onToggleReplies}
              replyingTo={replyingTo}
              replyTexts={replyTexts}
              replySubmitting={replySubmitting}
              onToggleLike={onToggleLike}
              onReply={onReply}
              onReplyTextChange={onReplyTextChange}
              onSubmitReply={onSubmitReply}
              isDark={isDark}
              th={th}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Metric card ───────────────────────────────────────────────────────────────
function MetricCard({
  label, value, icon, color, isDark, tooltip,
}: {
  label: string
  value: number
  icon: Parameters<typeof Icon>[0]['name']
  color: string
  isDark: boolean
  tooltip?: string
}) {
  return (
    <div
      className={tooltip ? 'ih-status-chip tooltip-above' : undefined}
      data-label={tooltip}
      style={{
        background: isDark ? '#0E1C3D' : 'white',
        borderRadius: 12,
        padding: '10px 14px',
        boxShadow: isDark ? '0 2px 8px rgba(0,0,0,.3)' : '0 1px 6px rgba(0,0,0,.06)',
        display: 'flex', alignItems: 'center', gap: 10,
        border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #f1f5f9',
      }}
    >
      <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: `${color}1a`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={14} />
      </div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 500, color: isDark ? 'rgba(255,255,255,0.45)' : '#94a3b8', lineHeight: 1.2, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: isDark ? 'rgba(255,255,255,0.92)' : '#1e293b', lineHeight: 1 }}>{value}</div>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getPriorityMeta(score: number) {
  if (score >= 80) return { label: 'Alta',  className: 'is-high'   }
  if (score >= 60) return { label: 'Média', className: 'is-medium' }
  return              { label: 'Baixa', className: 'is-low'    }
}

function formatIdeaDate(value: string) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}
