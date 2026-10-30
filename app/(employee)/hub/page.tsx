'use client'

import { Fragment, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { useIdeas } from '@/hooks/useIdeas'
import { useDebounce } from '@/hooks/useDebounce'
import { useUser } from '@/hooks/useUser'
import ProfileShell from '@/components/shared/ProfileShell'
import { getImprovementAreaLabel } from '@/components/shared/IdeaCard'
import Icon from '@/components/shared/Icon'
import LikeButton from '@/components/shared/LikeButton'
import type {
  IdeaListItem,
  IdeaStatus,
  IdeaComment,
  ImprovementArea,
  SortBy,
  Period,
} from '@/services/ideasService'
import { addComment, fetchComments, fetchIdeaById, fetchMyIdeas, fetchUserLikedCommentIds, toggleCommentLike } from '@/services/ideasService'
import { fetchUserRejectedIdeaIds, toggleDownvote } from '@/services/validationsService'

// ── Dark-mode store (useSyncExternalStore) ────────────────────────────────────
function subscribeDarkMode(cb: () => void) {
  window.addEventListener('ih:theme', cb)
  return () => window.removeEventListener('ih:theme', cb)
}
function getDarkModeSnapshot() {
  return localStorage.getItem('ih-dark-mode') === 'true'
}

// ── Brand tokens ─────────────────────────────────────────────────────────────
const BLUE = '#0057A8'

// ── Theme ────────────────────────────────────────────────────────────────────
type Theme = {
  pageBg: string
  stickyBg: string
  stickyBorder: string
  selectBg: string
  selectBorder: string
  selectColor: string
  tabInactiveColor: string
  chipStatusInactive: { bg: string; border: string; color: string }
  chipAreaActive: { bg: string; border: string; color: string }
  chipAreaInactive: { bg: string; border: string; color: string }
  searchBg: string
  searchBorder: string
  divider: string
  emptyBg: string
  emptyColor: string
  errBg: string
  cardBg: string
  cardShadow: string
  cardShadowHover: string
  textPrimary: string
  textSecondary: string
  textMuted: string
  actionBg: string
  actionColor: string
  anonBg: string
  sheetBg: string
  sheetBorder: string
  metaBlockBorder: string
  textareaBg: string
  textareaBorder: string
}

const LIGHT: Theme = {
  pageBg: '#FDFAF4',
  stickyBg: '#FDFAF4',
  stickyBorder: '1px solid #e2e8f0',
  selectBg: '#f8fafc',
  selectBorder: '1.5px solid #e2e8f0',
  selectColor: '#475569',
  tabInactiveColor: '#94a3b8',
  chipStatusInactive: { bg: 'white', border: '1.5px solid #e2e8f0', color: '#64748b' },
  chipAreaActive: { bg: '#dbeafe', border: `1.5px solid ${BLUE}`, color: BLUE },
  chipAreaInactive: { bg: 'white', border: '1.5px solid #e2e8f0', color: '#64748b' },
  searchBg: 'white',
  searchBorder: '1.5px solid #e2e8f0',
  divider: '#e2e8f0',
  emptyBg: 'white',
  emptyColor: '#94a3b8',
  errBg: 'rgba(220,38,38,.08)',
  cardBg: 'white',
  cardShadow: '0 2px 10px rgba(0,0,0,.08)',
  cardShadowHover: '0 8px 28px rgba(0,0,0,.15)',
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  actionBg: '#f1f5f9',
  actionColor: '#64748b',
  anonBg: '#e2e8f0',
  sheetBg: 'white',
  sheetBorder: '1px solid #e2e8f0',
  metaBlockBorder: '1px solid #e2e8f0',
  textareaBg: 'white',
  textareaBorder: '#e2e8f0',
}

const DARK: Theme = {
  pageBg: '#0B1733',
  stickyBg: '#0B1733',
  stickyBorder: '1px solid rgba(255,255,255,0.08)',
  selectBg: 'rgba(255,255,255,0.04)',
  selectBorder: '1.5px solid rgba(255,255,255,0.12)',
  selectColor: 'rgba(255,255,255,0.7)',
  tabInactiveColor: 'rgba(255,255,255,0.38)',
  chipStatusInactive: { bg: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)' },
  chipAreaActive: { bg: '#C49600', border: '1.5px solid #C49600', color: 'white' },
  chipAreaInactive: { bg: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)' },
  searchBg: 'rgba(255,255,255,0.04)',
  searchBorder: '1.5px solid rgba(255,255,255,0.12)',
  divider: 'rgba(255,255,255,0.08)',
  emptyBg: '#0E1C3D',
  emptyColor: 'rgba(255,255,255,0.38)',
  errBg: 'rgba(220,38,38,.15)',
  cardBg: '#0E1C3D',
  cardShadow: '0 2px 10px rgba(0,0,0,.4)',
  cardShadowHover: '0 8px 28px rgba(0,0,0,.6)',
  textPrimary: 'rgba(255,255,255,0.92)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.38)',
  actionBg: 'rgba(255,255,255,0.06)',
  actionColor: 'rgba(255,255,255,0.5)',
  anonBg: 'rgba(255,255,255,0.08)',
  sheetBg: '#0E1C3D',
  sheetBorder: '1px solid rgba(255,255,255,0.08)',
  metaBlockBorder: '1px solid rgba(255,255,255,0.08)',
  textareaBg: 'rgba(255,255,255,0.04)',
  textareaBorder: 'rgba(255,255,255,0.12)',
}

function scoreStyle(score: number, isDark: boolean): React.CSSProperties {
  if (isDark) {
    if (score >= 75) return { background: 'rgba(212,160,0,0.18)', color: '#D4A000' }
    if (score >= 50) return { background: 'rgba(251,191,36,0.12)', color: '#fbbf24' }
    return { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)' }
  }
  return { background: 'rgba(0,87,168,0.10)', color: BLUE }
}

// ── Static filter lists ───────────────────────────────────────────────────────
type StatusD7Entry = { label: string; barColor: string; chipBg: string; chipText: string }

function getStatusD7(isDark: boolean): Record<IdeaStatus, StatusD7Entry> {
  if (isDark) return {
    sugestao:         { label: 'Sugestão de Ideia', barColor: 'rgba(255,255,255,0.07)',  chipBg: 'rgba(255,198,0,0.28)',  chipText: '#FFC600' },
    em_analise:       { label: 'Em Análise',         barColor: 'rgba(255,198,0,0.18)',   chipBg: 'rgba(255,198,0,0.28)',  chipText: '#FFC600' },
    em_implantacao:   { label: 'Em Implantação',     barColor: 'rgba(255,198,0,0.45)',   chipBg: 'rgba(255,198,0,0.28)',  chipText: '#FFC600' },
    conhecimento_org: { label: 'Gerou Valor',        barColor: '#C49600',                chipBg: 'rgba(255,198,0,0.28)',  chipText: '#FFC600' },
    em_refinamento:   { label: 'Não aprovada',        barColor: 'rgba(251,146,60,0.35)',  chipBg: 'rgba(251,146,60,0.20)', chipText: '#fb923c' },
  }
  return {
    sugestao:         { label: 'Sugestão de Ideia', barColor: '#e2e8f0',  chipBg: '#dbeafe',           chipText: BLUE     },
    em_analise:       { label: 'Em Análise',         barColor: '#bfdbfe', chipBg: '#dbeafe',           chipText: BLUE     },
    em_implantacao:   { label: 'Em Implantação',     barColor: '#60a5fa', chipBg: '#dbeafe',           chipText: BLUE     },
    conhecimento_org: { label: 'Gerou Valor',        barColor: BLUE,      chipBg: '#dbeafe',           chipText: BLUE     },
    em_refinamento:   { label: 'Não aprovada',        barColor: 'rgba(234,88,12,0.3)', chipBg: 'rgba(251,146,60,0.10)', chipText: '#ea580c' },
  }
}

const STATUS_CHIPS: Array<{ value: IdeaStatus | null; label: string; desc?: string }> = [
  { value: 'sugestao',         label: 'Sugestões',          desc: 'Enviada, aguardando avaliação'   },
  { value: 'em_analise',       label: 'Em Análise',         desc: 'Analisando se será implantado'   },
  { value: 'em_implantacao',   label: 'Em Implantação',     desc: 'Aprovada pelo gestor'            },
  { value: 'conhecimento_org', label: 'Gerou Valor',        desc: 'Ideia implementada com sucesso'  },
  { value: null,               label: 'Todas',              desc: 'Exibir todos os status'        },
]

const AREA_OPTIONS: Array<{ value: ImprovementArea | null; label: string }> = [
  { value: null,        label: 'Todas as áreas' },
  { value: 'processo',  label: 'Processo'       },
  { value: 'custo',     label: 'Custo'          },
  { value: 'seguranca', label: 'Segurança'      },
  { value: 'qualidade', label: 'Qualidade'      },
]

const SORT_OPTIONS: Array<{ value: SortBy; label: string }> = [
  { value: 'relevancia',    label: 'Relevância'    },
  { value: 'maior-score',   label: 'Maior Score'   },
  { value: 'mais-votados',  label: 'Mais Votados'  },
  { value: 'menos-votados', label: 'Menos Votados' },
]

const PERIOD_OPTIONS: Array<{ value: Period; label: string }> = [
  { value: 'all', label: 'Sempre'     },
  { value: '7d',  label: '7 dias'     },
  { value: '30d', label: '30 dias'    },
  { value: '1y',  label: 'Último ano' },
]

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function authorInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
}

const ThumbDownSvg = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L10.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z" />
  </svg>
)

const CommentSvg = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
  </svg>
)

// ── Page ─────────────────────────────────────────────────────────────────────
export default function HubFuncionarioPage() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const hook = useIdeas(user?.id, { tab: 'global', sortBy: 'relevancia', period: 'all', status: 'sugestao' })

  const [selectedSectorId, setSelectedSectorId] = useState<string | null>(null)
  const [sectorReady, setSectorReady] = useState(false)
  const [sortBy, setSortBy] = useState<SortBy>('relevancia')
  const [period, setPeriod] = useState<Period>('all')
  const [status, setStatus] = useState<IdeaStatus | null>('sugestao')
  const [area, setArea]     = useState<ImprovementArea | null>(null)
  const [searchText, setSearchText] = useState('')
  const debouncedSearch = useDebounce(searchText, 300)
  const [statusTip, setStatusTip] = useState<{ desc: string; x: number; y: number } | null>(null)
  const [statusChangePending, setStatusChangePending] = useState(false)
  const [filtersReady, setFiltersReady] = useState(false)

  // Inicializa com "Meu setor" na primeira vez que o usuário carrega.
  // sectorReady é state para que o filter effect só dispare no próximo render,
  // quando selectedSectorId já foi atualizado para user.sector_id.
  useEffect(() => {
    if (user?.sector_id && !sectorReady) {
      setSectorReady(true)
      setSelectedSectorId(user.sector_id)
    }
  }, [user?.sector_id, sectorReady])

  const defaultSectorId = user?.sector_id ?? null

  const hasActiveFilters =
    selectedSectorId !== defaultSectorId ||
    sortBy !== 'relevancia' ||
    period !== 'all' ||
    status !== 'sugestao' ||
    area !== null ||
    searchText !== ''

  function clearFilters() {
    setSelectedSectorId(defaultSectorId)
    setSortBy('relevancia')
    setPeriod('all')
    setStatus('sugestao')
    setArea(null)
    setSearchText('')
  }

  const [selectedIdea, setSelectedIdea] = useState<IdeaListItem | null>(null)

  const [hubTab, setHubTab] = useState<'feed' | 'minhas'>(() => {
    if (typeof window === 'undefined') return 'feed'
    return new URLSearchParams(window.location.search).get('tab') === 'minhas' ? 'minhas' : 'feed'
  })
  const [myIdeas, setMyIdeas] = useState<IdeaListItem[]>([])
  const [loadingMyIdeas, setLoadingMyIdeas] = useState(false)
  const [myStatusFilter, setMyStatusFilter] = useState<IdeaStatus | null>(() => {
    if (typeof window === 'undefined') return null
    const f = new URLSearchParams(window.location.search).get('filter')
    return (f as IdeaStatus | null) ?? null
  })
  const [mySearch,   setMySearch]   = useState('')
  const [myArea,     setMyArea]     = useState<ImprovementArea | null>(null)
  const [mySort,     setMySort]     = useState<'recente' | 'score' | 'validadas'>('recente')
  const [myAreaOpen, setMyAreaOpen] = useState(false)
  const [mySortOpen, setMySortOpen] = useState(false)
  const myAreaRef = useRef<HTMLDivElement>(null)
  const mySortRef = useRef<HTMLDivElement>(null)
  const debouncedMySearch = useDebounce(mySearch, 300)

  const [rejectedIdeaIds, setRejectedIdeaIds] = useState<Set<string>>(new Set())
  const openedUrlIdeaId = useRef<string | null>(null)

  // ── Dark mode via useSyncExternalStore — sem race condition, sem flash
  const isDark = useSyncExternalStore(subscribeDarkMode, getDarkModeSnapshot, () => false)
  const th = isDark ? DARK : LIGHT

  // ── Responsive + auto-hide header ──────────────────────────────────────────
  const mainRef   = useRef<HTMLElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const [headerH, setHeaderH]           = useState(0)
  const [headerHidden, setHeaderHidden] = useState(false)
  const [isMobile, setIsMobile]         = useState(false)
  const lastScrollY = useRef(0)

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
    if (!user?.id) return
    fetchUserRejectedIdeaIds(user.id)
      .then((ids) => setRejectedIdeaIds(new Set(ids)))
      .catch(() => {})
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) return
    setLoadingMyIdeas(true)
    fetchMyIdeas(user.id)
      .then(setMyIdeas)
      .catch(() => setMyIdeas([]))
      .finally(() => setLoadingMyIdeas(false))
  }, [user?.id])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const ideaIdParam = params.get('idea')
    if (!ideaIdParam || openedUrlIdeaId.current === ideaIdParam) return
    const ideaId = ideaIdParam

    let cancelled = false
    openedUrlIdeaId.current = ideaId

    async function openIdeaFromUrl() {
      const localIdea = hook.ideas.find((idea) => idea.id === ideaId) ?? myIdeas.find((idea) => idea.id === ideaId)
      if (localIdea) {
        setSelectedIdea(localIdea)
        return
      }

      try {
        const idea = await fetchIdeaById(ideaId)
        if (!cancelled && idea) {
          setSelectedIdea(idea)
        }
      } catch {
        if (!cancelled) {
          openedUrlIdeaId.current = null
        }
      }
    }

    openIdeaFromUrl()
    return () => {
      cancelled = true
    }
  }, [hook.ideas, myIdeas])

  function closeIdeaSheet() {
    setSelectedIdea(null)
    openedUrlIdeaId.current = null

    const url = new URL(window.location.href)
    if (url.searchParams.has('idea')) {
      url.searchParams.delete('idea')
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
    }
  }

  useEffect(() => {
    if (!user || !sectorReady) return
    hook.setFilters({
      tab: 'global',
      sectorId: selectedSectorId ?? undefined,
      sortBy,
      period,
      status: status ?? undefined,
      area: area ?? undefined,
      search: debouncedSearch || undefined,
    })
    setFiltersReady(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectorReady, selectedSectorId, sortBy, period, status, area, debouncedSearch])

  useEffect(() => {
    if (!hook.loading) setStatusChangePending(false)
  }, [hook.loading])

  const [sectorDropdownOpen, setSectorDropdownOpen] = useState(false)
  const [areaDropdownOpen, setAreaDropdownOpen]     = useState(false)
  const [sortDropdownOpen, setSortDropdownOpen]     = useState(false)
  const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false)
  const sectorDropdownRef = useRef<HTMLDivElement>(null)
  const areaDropdownRef   = useRef<HTMLDivElement>(null)
  const sortDropdownRef   = useRef<HTMLDivElement>(null)
  const periodDropdownRef = useRef<HTMLDivElement>(null)

  const sectorButtonLabel = selectedSectorId !== null
    ? (hook.sectors.find((s) => s.id === selectedSectorId)?.name ?? 'Setor')
    : 'Todos'
  const areaButtonLabel   = area !== null
    ? (AREA_OPTIONS.find((o) => o.value === area)?.label ?? 'Todas')
    : 'Todas'
  const sortButtonLabel   = SORT_OPTIONS.find((o) => o.value === sortBy)?.label   ?? 'Relevância'
  const periodButtonLabel = PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? 'Sempre'

  useEffect(() => {
    if (!sectorDropdownOpen) return
    function onOutside(e: MouseEvent) {
      if (sectorDropdownRef.current && !sectorDropdownRef.current.contains(e.target as Node)) setSectorDropdownOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [sectorDropdownOpen])

  useEffect(() => {
    if (!areaDropdownOpen) return
    function onOutside(e: MouseEvent) {
      if (areaDropdownRef.current && !areaDropdownRef.current.contains(e.target as Node)) setAreaDropdownOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [areaDropdownOpen])

  useEffect(() => {
    if (!sortDropdownOpen) return
    function onOutside(e: MouseEvent) {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) setSortDropdownOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [sortDropdownOpen])

  useEffect(() => {
    if (!periodDropdownOpen) return
    function onOutside(e: MouseEvent) {
      if (periodDropdownRef.current && !periodDropdownRef.current.contains(e.target as Node)) setPeriodDropdownOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [periodDropdownOpen])

  useEffect(() => {
    if (!myAreaOpen) return
    function h(e: MouseEvent) {
      if (myAreaRef.current && !myAreaRef.current.contains(e.target as Node)) setMyAreaOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [myAreaOpen])

  useEffect(() => {
    if (!mySortOpen) return
    function h(e: MouseEvent) {
      if (mySortRef.current && !mySortRef.current.contains(e.target as Node)) setMySortOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [mySortOpen])

  const emptyMessage = useMemo(() => {
    if (debouncedSearch.trim()) {
      return `Nenhuma ideia encontrada para "${debouncedSearch.trim()}". Tente ampliar os filtros.`
    }
    return 'Nenhuma ideia encontrada para os filtros selecionados.'
  }, [debouncedSearch])

  const filteredMyIdeas = useMemo(() => {
    let result = myStatusFilter === null ? myIdeas : myIdeas.filter((i) => i.status === myStatusFilter)
    if (debouncedMySearch.trim()) {
      const q = debouncedMySearch.toLowerCase()
      result = result.filter((i) => i.title.toLowerCase().includes(q) || (i.summary ?? '').toLowerCase().includes(q))
    }
    if (myArea !== null) result = result.filter((i) => i.improvement_area === myArea)
    if (mySort === 'score') {
      result = [...result].sort((a, b) => (b.hybrid_score ?? 0) - (a.hybrid_score ?? 0))
    } else if (mySort === 'validadas') {
      result = [...result].sort((a, b) => b.social_score - a.social_score)
    } else {
      result = [...result].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }
    return result
  }, [myIdeas, myStatusFilter, debouncedMySearch, myArea, mySort])

  async function handleDownvote(ideaId: string) {
    if (!user?.id) return

    // Se a ideia está curtida, remove o like em paralelo (optimistic update é imediato)
    if (hook.validatedIdeaIds.has(ideaId)) {
      void hook.validateIdea(ideaId)
    }

    setRejectedIdeaIds((prev) => {
      const next = new Set(prev)
      if (next.has(ideaId)) next.delete(ideaId)
      else next.add(ideaId)
      return next
    })
    try {
      const { active } = await toggleDownvote(ideaId, user.id)
      setRejectedIdeaIds((prev) => {
        const next = new Set(prev)
        if (active) next.add(ideaId)
        else next.delete(ideaId)
        return next
      })
    } catch {
      setRejectedIdeaIds((prev) => {
        const next = new Set(prev)
        if (next.has(ideaId)) next.delete(ideaId)
        else next.add(ideaId)
        return next
      })
    }
  }

  async function handleValidate(ideaId: string) {
    // Se a ideia está rejeitada, remove o dislike antes de curtir
    if (rejectedIdeaIds.has(ideaId) && user?.id) {
      setRejectedIdeaIds((prev) => {
        const next = new Set(prev)
        next.delete(ideaId)
        return next
      })
      try {
        await toggleDownvote(ideaId, user.id)
      } catch {
        setRejectedIdeaIds((prev) => new Set(prev).add(ideaId))
        return
      }
    }

    await hook.validateIdea(ideaId)
  }

  if (userLoading) return <p className="ih-loading-page">Carregando...</p>

  return (
    <ProfileShell
      profile={user?.role === 'gestor' ? 'gestor' : 'funcionario'}
      title="Hub de Ideias"
      subtitle="Explore, valide e acompanhe sugestões da comunidade"
      user={user}
      points={user?.points ?? 0}
      notifCount={2}
      noPadding
      pageBodyClass="light-page"
      mainRef={mainRef}
    >
      <div style={{ background: th.pageBg, minHeight: '100%' }}>

        {/* ── Sticky: chips de escopo/área + filtros secundários ── */}
        <div style={{
          position: 'sticky',
          top: isMobile && headerH > 0 ? (headerHidden ? -headerH : 0) : 0,
          zIndex: 50,
          transition: isMobile ? 'top 0.26s ease' : undefined,
        }}>
          <div ref={headerRef} style={{ background: th.stickyBg }}>
            <div style={{ maxWidth: 880, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>

              {/* ── Linha 1: Toggle Feed / Minhas ideias (oculto para gestor) ── */}
              {user?.role !== 'gestor' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderBottom: `1px solid ${th.divider}` }}>
                  {([
                    { value: 'feed',   label: 'Feed da comunidade', icon: 'layers' as const },
                    { value: 'minhas', label: 'Minhas ideias',       icon: 'user'   as const },
                  ] as const).map((tab) => {
                    const isActive = hubTab === tab.value
                    const accent   = isDark ? '#FFC600' : BLUE
                    return (
                      <button
                        key={tab.value}
                        type="button"
                        onClick={() => setHubTab(tab.value)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '5px 14px', borderRadius: 100,
                          fontSize: 13, fontWeight: 700, cursor: 'pointer',
                          fontFamily: 'inherit', whiteSpace: 'nowrap',
                          border: `1.5px solid ${isActive ? accent : (isDark ? 'rgba(255,255,255,0.15)' : '#e2e8f0')}`,
                          background: isActive ? (isDark ? `${accent}18` : `${accent}12`) : 'transparent',
                          color: isActive ? accent : th.textSecondary,
                          transition: 'all .15s',
                        }}
                      >
                        <Icon name={tab.icon} size={13} />
                        {tab.label}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* ── Linha 2: Status chips ── */}
              {hubTab === 'feed' ? (
                <div className="ih-status-row" style={{ display: 'flex', alignItems: 'center', borderBottom: `1px solid ${th.divider}`, padding: '0 24px', overflowX: 'auto' }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: th.textMuted, textTransform: 'uppercase', letterSpacing: '.08em', whiteSpace: 'nowrap', marginRight: 8, flexShrink: 0, opacity: 0.45, userSelect: 'none', pointerEvents: 'none' }}>Status</span>
                  {STATUS_CHIPS.map((chip) => {
                    const isActive = status === chip.value
                    const accent   = isDark ? '#FFC600' : BLUE
                    return (
                      <button key={chip.value ?? 'all'} type="button"
                        onClick={() => { setStatus(chip.value); setStatusChangePending(true) }}
                        onMouseEnter={(e) => { const r = e.currentTarget.getBoundingClientRect(); setStatusTip({ desc: chip.desc ?? '', x: r.left + r.width / 2, y: r.bottom + 8 }) }}
                        onMouseLeave={() => setStatusTip(null)}
                        style={{ padding: '0 12px', height: 40, flexShrink: 0, background: 'none', border: 'none', borderBottom: isActive ? `2px solid ${accent}` : '2px solid transparent', marginBottom: -1, color: isActive ? (isDark ? 'rgba(255,255,255,0.92)' : th.textPrimary) : th.textMuted, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap', fontFamily: 'inherit', transition: 'color .15s, border-color .15s' }}
                      >
                        {chip.label}
                        {isActive && (
                          <span style={{ fontSize: 11, fontWeight: 800, background: isDark ? 'rgba(255,198,0,0.15)' : 'rgba(0,87,168,0.10)', color: accent, padding: '1px 7px', borderRadius: 100, lineHeight: 1.7, display: 'inline-block', opacity: filtersReady && !statusChangePending && !hook.loading && hook.ideas.length > 0 ? 1 : 0, transform: filtersReady && !statusChangePending && !hook.loading && hook.ideas.length > 0 ? 'scale(1)' : 'scale(0.6)', transformOrigin: 'left center', transition: 'opacity 0.2s ease, transform 0.2s ease' }}>
                            {hook.ideas.length || 0}
                          </span>
                        )}
                      </button>
                    )
                  })}
                  {hasActiveFilters && (
                    <button type="button" onClick={clearFilters}
                      style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0, padding: '4px 10px', borderRadius: 8, border: `1.5px solid ${isDark ? 'rgba(220,38,38,0.3)' : 'rgba(220,38,38,0.2)'}`, background: isDark ? 'rgba(220,38,38,0.08)' : 'rgba(220,38,38,0.05)', fontSize: 12, fontWeight: 600, color: isDark ? '#fca5a5' : '#dc2626', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                      <Icon name="x" size={11} />
                      Limpar
                    </button>
                  )}
                </div>
              ) : (
                /* Minhas ideias — status chips com contagem sempre visível */
                <div className="ih-status-row" style={{ display: 'flex', alignItems: 'center', gap: 4, borderBottom: `1px solid ${th.divider}`, padding: '0 24px', overflowX: 'auto', height: 48 }}>
                  {([
                    { value: 'sugestao'         as IdeaStatus, label: 'Sugestões'       },
                    { value: 'em_analise'       as IdeaStatus, label: 'Em análise'      },
                    { value: 'em_implantacao'   as IdeaStatus, label: 'Em implantação'  },
                    { value: 'conhecimento_org' as IdeaStatus, label: 'Gerou valor'     },
                    { value: 'em_refinamento'   as IdeaStatus, label: 'Não aprovada'    },
                    { value: null,               label: 'Todas'           },
                  ]).map((chip) => {
                    const isActive = myStatusFilter === chip.value
                    const accent   = isDark ? '#FFC600' : BLUE
                    const q = debouncedMySearch.toLowerCase().trim()
                    const count = myIdeas.filter((i) => {
                      if (chip.value !== null && i.status !== chip.value) return false
                      if (q && !i.title.toLowerCase().includes(q) && !(i.summary ?? '').toLowerCase().includes(q)) return false
                      if (myArea !== null && i.improvement_area !== myArea) return false
                      return true
                    }).length
                    const isNaoAprovada = chip.value === 'em_refinamento'
                    const chipAccent = isNaoAprovada ? '#f97316' : accent
                    return (
                      <button key={chip.value ?? 'all'} type="button"
                        onClick={() => setMyStatusFilter(chip.value as IdeaStatus | null)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 100, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0, border: `1.5px solid ${isActive ? chipAccent : (isDark ? 'rgba(255,255,255,0.12)' : '#e2e8f0')}`, background: isActive ? (isNaoAprovada ? 'rgba(249,115,22,0.10)' : (isDark ? `${accent}18` : `${accent}12`)) : 'transparent', color: isActive ? chipAccent : th.textSecondary, transition: 'all .15s' }}
                      >
                        {chip.label}
                        <span style={{ fontSize: 10, fontWeight: 800, background: isActive ? (isNaoAprovada ? 'rgba(249,115,22,0.20)' : (isDark ? `${accent}30` : `${accent}18`)) : (isDark ? 'rgba(255,255,255,0.10)' : '#f1f5f9'), color: isActive ? chipAccent : th.textMuted, padding: '1px 6px', borderRadius: 100, lineHeight: 1.7 }}>
                          {count}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* ── Linha 3: filtros de "Minhas ideias" ── */}
              {hubTab === 'minhas' && (
                <div style={{ padding: '10px 24px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: isDark ? '#D4A000' : BLUE, pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                      <Icon name="search" size={15} />
                    </span>
                    <input
                      type="search" placeholder="Buscar nas suas ideias..." value={mySearch}
                      onChange={(e) => setMySearch(e.target.value)} aria-label="Buscar nas suas ideias"
                      style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: 10, border: th.searchBorder, background: th.searchBg, fontSize: 13, outline: 'none', fontFamily: 'inherit', color: th.textPrimary, boxSizing: 'border-box' }}
                    />
                  </div>

                  <div ref={myAreaRef} style={{ position: 'relative', flexShrink: 0 }}>
                    <button type="button" onClick={() => setMyAreaOpen((p) => !p)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${myArea !== null ? (isDark ? '#FFC600' : BLUE) : (isDark ? 'rgba(255,255,255,0.15)' : '#e2e8f0')}`, background: 'transparent', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit', transition: 'border-color .15s' }}>
                      <span style={{ fontSize: 10, color: th.textMuted, fontWeight: 500 }}>Área</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: myArea !== null ? (isDark ? '#FFC600' : BLUE) : th.textPrimary }}>
                        {myArea !== null ? (AREA_OPTIONS.find((o) => o.value === myArea)?.label ?? 'Todas') : 'Todas'}
                      </span>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: th.textMuted, flexShrink: 0 }}><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    {myAreaOpen && (
                      <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: th.sheetBg, border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`, borderRadius: 10, boxShadow: isDark ? '0 8px 24px rgba(0,0,0,.5)' : '0 8px 24px rgba(0,0,0,.12)', zIndex: 200, minWidth: 170, overflow: 'hidden', padding: '4px 0' }}>
                        {AREA_OPTIONS.map((opt) => {
                          const isSel = myArea === opt.value
                          const accent = isDark ? '#FFC600' : BLUE
                          return <button key={opt.value ?? 'all'} type="button" onClick={() => { setMyArea(opt.value); setMyAreaOpen(false) }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 16px', fontSize: 13, fontWeight: isSel ? 700 : 400, background: isSel ? (isDark ? 'rgba(255,255,255,0.08)' : '#eff6ff') : 'transparent', color: isSel ? accent : th.textPrimary, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>{opt.label}</button>
                        })}
                      </div>
                    )}
                  </div>

                  <div ref={mySortRef} style={{ position: 'relative', flexShrink: 0 }}>
                    <button type="button" onClick={() => setMySortOpen((p) => !p)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${mySort !== 'recente' ? (isDark ? '#FFC600' : BLUE) : (isDark ? 'rgba(255,255,255,0.15)' : '#e2e8f0')}`, background: 'transparent', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit', transition: 'border-color .15s' }}>
                      <span style={{ fontSize: 10, color: th.textMuted, fontWeight: 500 }}>Ordenar</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: mySort !== 'recente' ? (isDark ? '#FFC600' : BLUE) : th.textPrimary }}>
                        {mySort === 'score' ? 'Maior Score' : mySort === 'validadas' ? 'Mais validadas' : 'Mais recentes'}
                      </span>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: th.textMuted, flexShrink: 0 }}><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    {mySortOpen && (
                      <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: th.sheetBg, border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`, borderRadius: 10, boxShadow: isDark ? '0 8px 24px rgba(0,0,0,.5)' : '0 8px 24px rgba(0,0,0,.12)', zIndex: 200, minWidth: 160, overflow: 'hidden', padding: '4px 0' }}>
                        {([
                          { value: 'recente',   label: 'Mais recentes'  },
                          { value: 'score',     label: 'Maior Score'    },
                          { value: 'validadas', label: 'Mais validadas' },
                        ] as const).map((o) => {
                          const isSel = mySort === o.value
                          const accent = isDark ? '#FFC600' : BLUE
                          return <button key={o.value} type="button" onClick={() => { setMySort(o.value); setMySortOpen(false) }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 16px', fontSize: 13, fontWeight: isSel ? 700 : 400, background: isSel ? (isDark ? 'rgba(255,255,255,0.08)' : '#eff6ff') : 'transparent', color: isSel ? accent : th.textPrimary, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>{o.label}</button>
                        })}
                      </div>
                    )}
                  </div>

                  {(mySearch !== '' || myArea !== null || mySort !== 'recente') && (
                    <button type="button"
                      onClick={() => { setMySearch(''); setMyArea(null); setMySort('recente') }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0, padding: '4px 10px', borderRadius: 8, border: `1.5px solid ${isDark ? 'rgba(220,38,38,0.3)' : 'rgba(220,38,38,0.2)'}`, background: isDark ? 'rgba(220,38,38,0.08)' : 'rgba(220,38,38,0.05)', fontSize: 12, fontWeight: 600, color: isDark ? '#fca5a5' : '#dc2626', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                      <Icon name="x" size={11} />
                      Limpar
                    </button>
                  )}
                </div>
              )}

              {/* ── Linha 2: busca + filtros no estilo "Label Valor ↓" ── */}
              {hubTab !== 'minhas' && (isMobile ? (
                <div style={{ padding: '10px 24px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: isDark ? '#D4A000' : BLUE, pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                      <Icon name="search" size={15} />
                    </span>
                    <input type="search" placeholder="Buscar ideias..." value={searchText} onChange={(e) => setSearchText(e.target.value)} aria-label="Buscar ideias"
                      style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: 10, border: th.searchBorder, background: th.searchBg, fontSize: 14, outline: 'none', fontFamily: 'inherit', color: th.textPrimary, boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <select value={selectedSectorId ?? ''} onChange={(e) => setSelectedSectorId(e.target.value || null)} aria-label="Setor"
                      style={{ flex: 1, background: th.selectBg, border: th.selectBorder, color: th.selectColor, borderRadius: 8, padding: '7px 8px', fontSize: 12, fontWeight: 600, cursor: 'pointer', outline: 'none' }}>
                      <option value="">Todos</option>
                      {user?.sector_id && <option value={user.sector_id}>Meu setor</option>}
                      {hook.sectors.filter((s) => s.id !== user?.sector_id).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <select value={area ?? ''} onChange={(e) => setArea((e.target.value || null) as ImprovementArea | null)} aria-label="Área"
                      style={{ flex: 1, background: th.selectBg, border: th.selectBorder, color: th.selectColor, borderRadius: 8, padding: '7px 8px', fontSize: 12, fontWeight: 600, cursor: 'pointer', outline: 'none' }}>
                      {AREA_OPTIONS.map((o) => <option key={o.value ?? 'all'} value={o.value ?? ''}>{o.label}</option>)}
                    </select>
                    <select value={period} onChange={(e) => setPeriod(e.target.value as Period)} aria-label="Período"
                      style={{ flex: 1, background: th.selectBg, border: th.selectBorder, color: th.selectColor, borderRadius: 8, padding: '7px 8px', fontSize: 12, fontWeight: 600, cursor: 'pointer', outline: 'none' }}>
                      {PERIOD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)} aria-label="Ordenar"
                      style={{ flex: 1, background: th.selectBg, border: th.selectBorder, color: th.selectColor, borderRadius: 8, padding: '7px 8px', fontSize: 12, fontWeight: 600, cursor: 'pointer', outline: 'none' }}>
                      {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '10px 24px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>

                  {/* Busca */}
                  <div style={{ flex: 1, position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: isDark ? '#D4A000' : BLUE, pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                      <Icon name="search" size={15} />
                    </span>
                    <input type="search" placeholder="Buscar ideias..." value={searchText} onChange={(e) => setSearchText(e.target.value)} aria-label="Buscar ideias"
                      style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: 10, border: th.searchBorder, background: th.searchBg, fontSize: 14, outline: 'none', fontFamily: 'inherit', color: th.textPrimary, boxSizing: 'border-box' }}
                    />
                  </div>

                  {/* ── Setor ── */}
                  <div ref={sectorDropdownRef} style={{ position: 'relative', flexShrink: 0 }}>
                    <button type="button" onClick={() => setSectorDropdownOpen((p) => !p)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${selectedSectorId !== null ? (isDark ? '#FFC600' : BLUE) : (isDark ? 'rgba(255,255,255,0.15)' : '#e2e8f0')}`, background: 'transparent', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit', transition: 'border-color .15s' }}>
                      <span style={{ fontSize: 10, color: th.textMuted, fontWeight: 500 }}>Setor</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: selectedSectorId !== null ? (isDark ? '#FFC600' : BLUE) : th.textPrimary }}>{sectorButtonLabel}</span>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: th.textMuted, flexShrink: 0 }}><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    {sectorDropdownOpen && (
                      <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, background: th.sheetBg, border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`, borderRadius: 10, boxShadow: isDark ? '0 8px 24px rgba(0,0,0,.5)' : '0 8px 24px rgba(0,0,0,.12)', zIndex: 200, minWidth: 190, overflow: 'hidden', padding: '4px 0' }}>
                        <button type="button" onClick={() => { setSelectedSectorId(null); setSectorDropdownOpen(false) }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 16px', fontSize: 13, fontWeight: selectedSectorId === null ? 700 : 400, background: selectedSectorId === null ? (isDark ? 'rgba(255,255,255,0.08)' : '#eff6ff') : 'transparent', color: selectedSectorId === null ? (isDark ? '#FFC600' : BLUE) : th.textPrimary, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Todos os setores</button>
                        {user?.sector_id && (
                          <button type="button" onClick={() => { setSelectedSectorId(user?.sector_id ?? null); setSectorDropdownOpen(false) }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 16px', fontSize: 13, fontWeight: selectedSectorId === user.sector_id ? 700 : 400, background: selectedSectorId === user.sector_id ? (isDark ? 'rgba(255,255,255,0.08)' : '#eff6ff') : 'transparent', color: selectedSectorId === user.sector_id ? (isDark ? '#FFC600' : BLUE) : th.textPrimary, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Meu setor</button>
                        )}
                        {hook.sectors.length > 0 && <div style={{ height: 1, background: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9', margin: '4px 0' }} />}
                        {hook.sectors.map((s) => {
                          const isSel = selectedSectorId === s.id
                          return <button key={s.id} type="button" onClick={() => { setSelectedSectorId(s.id); setSectorDropdownOpen(false) }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 16px', fontSize: 13, fontWeight: isSel ? 700 : 400, background: isSel ? (isDark ? 'rgba(255,255,255,0.08)' : '#eff6ff') : 'transparent', color: isSel ? (isDark ? '#FFC600' : BLUE) : th.textPrimary, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>{s.name}</button>
                        })}
                      </div>
                    )}
                  </div>

                  {/* ── Área ── */}
                  <div ref={areaDropdownRef} style={{ position: 'relative', flexShrink: 0 }}>
                    <button type="button" onClick={() => setAreaDropdownOpen((p) => !p)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${area !== null ? (isDark ? '#FFC600' : BLUE) : (isDark ? 'rgba(255,255,255,0.15)' : '#e2e8f0')}`, background: 'transparent', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit', transition: 'border-color .15s' }}>
                      <span style={{ fontSize: 10, color: th.textMuted, fontWeight: 500 }}>Área</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: area !== null ? (isDark ? '#FFC600' : BLUE) : th.textPrimary }}>{areaButtonLabel}</span>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: th.textMuted, flexShrink: 0 }}><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    {areaDropdownOpen && (
                      <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, background: th.sheetBg, border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`, borderRadius: 10, boxShadow: isDark ? '0 8px 24px rgba(0,0,0,.5)' : '0 8px 24px rgba(0,0,0,.12)', zIndex: 200, minWidth: 170, overflow: 'hidden', padding: '4px 0' }}>
                        {AREA_OPTIONS.map((opt) => {
                          const isSel = area === opt.value
                          return <button key={opt.value ?? 'all'} type="button" onClick={() => { setArea(opt.value); setAreaDropdownOpen(false) }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 16px', fontSize: 13, fontWeight: isSel ? 700 : 400, background: isSel ? (isDark ? 'rgba(255,255,255,0.08)' : '#eff6ff') : 'transparent', color: isSel ? (isDark ? '#FFC600' : BLUE) : th.textPrimary, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>{opt.label}</button>
                        })}
                      </div>
                    )}
                  </div>

                  <div style={{ width: 1, height: 20, background: th.divider, flexShrink: 0 }} />

                  {/* ── Período ── */}
                  <div ref={periodDropdownRef} style={{ position: 'relative', flexShrink: 0 }}>
                    <button type="button" onClick={() => setPeriodDropdownOpen((p) => !p)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${period !== 'all' ? (isDark ? '#FFC600' : BLUE) : (isDark ? 'rgba(255,255,255,0.15)' : '#e2e8f0')}`, background: 'transparent', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit', transition: 'border-color .15s' }}>
                      <span style={{ fontSize: 10, color: th.textMuted, fontWeight: 500 }}>Período</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: period !== 'all' ? (isDark ? '#FFC600' : BLUE) : th.textPrimary }}>{periodButtonLabel}</span>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: th.textMuted, flexShrink: 0 }}><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    {periodDropdownOpen && (
                      <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, background: th.sheetBg, border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`, borderRadius: 10, boxShadow: isDark ? '0 8px 24px rgba(0,0,0,.5)' : '0 8px 24px rgba(0,0,0,.12)', zIndex: 200, minWidth: 140, overflow: 'hidden', padding: '4px 0' }}>
                        {PERIOD_OPTIONS.map((o) => {
                          const isSel = period === o.value
                          return <button key={o.value} type="button" onClick={() => { setPeriod(o.value); setPeriodDropdownOpen(false) }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 16px', fontSize: 13, fontWeight: isSel ? 700 : 400, background: isSel ? (isDark ? 'rgba(255,255,255,0.08)' : '#eff6ff') : 'transparent', color: isSel ? (isDark ? '#FFC600' : BLUE) : th.textPrimary, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>{o.label}</button>
                        })}
                      </div>
                    )}
                  </div>

                  {/* ── Ordenar ── */}
                  <div ref={sortDropdownRef} style={{ position: 'relative', flexShrink: 0 }}>
                    <button type="button" onClick={() => setSortDropdownOpen((p) => !p)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${sortBy !== 'relevancia' ? (isDark ? '#FFC600' : BLUE) : (isDark ? 'rgba(255,255,255,0.15)' : '#e2e8f0')}`, background: 'transparent', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit', transition: 'border-color .15s' }}>
                      <span style={{ fontSize: 10, color: th.textMuted, fontWeight: 500 }}>Ordenar</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: sortBy !== 'relevancia' ? (isDark ? '#FFC600' : BLUE) : th.textPrimary }}>{sortButtonLabel}</span>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: th.textMuted, flexShrink: 0 }}><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    {sortDropdownOpen && (
                      <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: th.sheetBg, border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`, borderRadius: 10, boxShadow: isDark ? '0 8px 24px rgba(0,0,0,.5)' : '0 8px 24px rgba(0,0,0,.12)', zIndex: 200, minWidth: 160, overflow: 'hidden', padding: '4px 0' }}>
                        {SORT_OPTIONS.map((o) => {
                          const isSel = sortBy === o.value
                          return <button key={o.value} type="button" onClick={() => { setSortBy(o.value); setSortDropdownOpen(false) }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 16px', fontSize: 13, fontWeight: isSel ? 700 : 400, background: isSel ? (isDark ? 'rgba(255,255,255,0.08)' : '#eff6ff') : 'transparent', color: isSel ? (isDark ? '#FFC600' : BLUE) : th.textPrimary, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>{o.label}</button>
                        })}
                      </div>
                    )}
                  </div>

                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Idea feed ── */}
        <div style={{ maxWidth: 880, margin: '0 auto', padding: '20px 24px 80px', display: 'flex', flexDirection: 'column', gap: 18, minHeight: 'calc(100vh - 160px)' }}>
          {hubTab === 'minhas' ? (
            loadingMyIdeas ? (
              <p className="ih-loading-page" style={{ minHeight: 280 }}>Carregando suas ideias...</p>
            ) : myIdeas.length === 0 ? (
              <div style={{ padding: '48px 20px', textAlign: 'center', color: th.emptyColor, fontSize: 14, background: th.emptyBg, borderRadius: 18 }}>
                Você ainda não enviou nenhuma ideia. Clique em Nova ideia para começar!
              </div>
            ) : filteredMyIdeas.length === 0 ? (
              <div style={{ padding: '48px 20px', textAlign: 'center', color: th.emptyColor, fontSize: 14, background: th.emptyBg, borderRadius: 18 }}>
                Nenhuma ideia com esse status ainda.
              </div>
            ) : (
              filteredMyIdeas.map((idea) => (
                <D7Card
                  key={idea.id}
                  idea={idea}
                  currentUserId={user?.id ?? ''}
                  hasValidated={hook.validatedIdeaIds.has(idea.id)}
                  hasRejected={rejectedIdeaIds.has(idea.id)}
                  hybridWeights={hook.hybridWeights}
                  onValidate={handleValidate}
                  onDownvote={handleDownvote}
                  onClick={setSelectedIdea}
                  isDark={isDark}
                  th={th}
                  readOnly={user?.role === 'gestor'}
                />
              ))
            )
          ) : !filtersReady || hook.loading ? (
            <p className="ih-loading-page" style={{ minHeight: 280 }}>Carregando ideias...</p>
          ) : hook.error ? (
            <div style={{ padding: '16px 20px', borderRadius: 12, background: th.errBg, color: '#DC2626', fontWeight: 700, fontSize: 14 }}>
              {hook.error}
            </div>
          ) : hook.ideas.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: th.emptyColor, fontSize: 14, background: th.emptyBg, borderRadius: 18 }}>
              {emptyMessage}
            </div>
          ) : (
            hook.ideas.map((idea) => (
              <D7Card
                key={idea.id}
                idea={idea}
                currentUserId={user?.id ?? ''}
                hasValidated={hook.validatedIdeaIds.has(idea.id)}
                hasRejected={rejectedIdeaIds.has(idea.id)}
                hybridWeights={hook.hybridWeights}
                onValidate={handleValidate}
                onDownvote={handleDownvote}
                onClick={setSelectedIdea}
                isDark={isDark}
                th={th}
              />
            ))
          )}
        </div>

        {/* FAB — oculto para gestor */}
        {user?.role !== 'gestor' && <button
          type="button"
          aria-label="Nova ideia"
          onClick={() => router.push('/ia-innovation')}
          style={{
            position: 'fixed', bottom: 76, right: 28,
            height: 52, borderRadius: 100,
            padding: '0 22px 0 18px',
            background: isDark ? '#FFC600' : BLUE,
            color: isDark ? '#0B1733' : 'white',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 10,
            boxShadow: '0px 2px 10px rgba(255,198,0,0.35)',
            zIndex: 100,
            fontFamily: 'inherit',
          }}
        >
          <span style={{ fontSize: 24, lineHeight: 1, marginBottom: 1 }}>+</span>
          <span style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap' }}>Nova ideia</span>
        </button>}
      </div>

      {selectedIdea && (
        <IdeaSheet
          idea={hook.ideas.find((i) => i.id === selectedIdea.id) ?? myIdeas.find((i) => i.id === selectedIdea.id) ?? selectedIdea}
          currentUserId={user?.id ?? ''}
          userId={user?.id ?? ''}
          onClose={closeIdeaSheet}
          onValidate={handleValidate}
          onDownvote={handleDownvote}
          hybridWeights={hook.hybridWeights}
          hasValidated={hook.validatedIdeaIds.has(selectedIdea.id)}
          hasRejected={rejectedIdeaIds.has(selectedIdea.id)}
          onNewComment={(c) => hook.onCommentAdded(selectedIdea.id, c)}
          isDark={isDark}
          th={th}
          readOnly={user?.role === 'gestor'}
        />
      )}

      {/* Tooltip de status — position:fixed para escapar de qualquer overflow */}
      {statusTip && (
        <div style={{
          position: 'fixed',
          left: statusTip.x,
          top: statusTip.y,
          transform: 'translateX(-50%)',
          background: '#1a2332',
          color: 'rgba(255,255,255,0.95)',
          padding: '5px 10px',
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 600,
          whiteSpace: 'nowrap',
          zIndex: 9999,
          pointerEvents: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}>
          {statusTip.desc}
        </div>
      )}
    </ProfileShell>
  )
}

// ── Comment Node (recursivo) ─────────────────────────────────────────────────
function CommentNode({
  comment,
  depth,
  userId,
  likedCommentIds,
  openReplies,
  onToggleReplies,
  replyingTo,
  replyTexts,
  replySubmitting,
  onToggleLike,
  onReply,
  onReplyTextChange,
  onSubmitReply,
  isDark,
  th,
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
  const repliesOpen = openReplies.has(comment.id)
  const isLiked = likedCommentIds.has(comment.id)
  const isReplying = replyingTo === comment.id
  const accentColor = isDark ? '#FFC600' : BLUE
  const lineColor = isDark ? 'rgba(255,255,255,0.10)' : '#e2e8f0'
  const showReplies = depth > 0 || repliesOpen

  return (
    <div>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          background: isDark ? 'rgba(255,255,255,0.10)' : BLUE,
          color: isDark ? 'rgba(255,255,255,0.80)' : 'white',
          fontSize: 10, fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {comment.author_name ? authorInitials(comment.author_name) : '?'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: th.textPrimary }}>{comment.author_name}</span>
            <span style={{ fontSize: 10, color: th.textMuted }}>{formatDate(comment.created_at)}</span>
          </div>
          <div style={{ fontSize: 13, color: th.textSecondary, lineHeight: 1.5, wordBreak: 'break-word' }}>{comment.content}</div>
          {/* Ações */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
            {/* Like */}
            <button
              type="button"
              onClick={() => onToggleLike(comment.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                fontSize: 12, fontWeight: 600,
                color: isLiked ? accentColor : th.textMuted,
                transition: 'color .12s',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              {comment.like_count > 0 && comment.like_count}
            </button>
            {/* Reply */}
            <button
              type="button"
              onClick={() => onReply(comment.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                fontSize: 12, fontWeight: 600,
                color: isReplying ? accentColor : th.textMuted,
                transition: 'color .12s',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 17 4 12 9 7" />
                <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
              </svg>
              Responder
            </button>
            {/* Ver / ocultar respostas — dentro da linha de ações para não mudar de posição */}
            {depth === 0 && comment.replies.length > 0 && (
              <button
                type="button"
                onClick={() => onToggleReplies(comment.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  fontSize: 12, fontWeight: 700,
                  color: accentColor,
                  fontFamily: 'inherit',
                  transition: 'color .12s',
                }}
              >
                <svg
                  width="12" height="12"
                  viewBox="0 0 24 24"
                  fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{ transition: 'transform .2s', transform: repliesOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
                {repliesOpen
                  ? 'Ocultar respostas'
                  : `Ver ${comment.replies.length} resposta${comment.replies.length !== 1 ? 's' : ''}`}
              </button>
            )}
          </div>
          {/* Caixa de reply inline */}
          {isReplying && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'flex-start' }}>
              <textarea
                value={replyTexts[comment.id] ?? ''}
                onChange={(e) => onReplyTextChange(comment.id, e.target.value)}
                placeholder={`Respondendo ${comment.author_name}…`}
                rows={2}
                style={{
                  flex: 1, resize: 'none', fontSize: 13, padding: '8px 12px',
                  borderRadius: 8, border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#e2e8f0'}`,
                  background: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
                  color: th.textPrimary, fontFamily: 'inherit', outline: 'none',
                }}
              />
              <button
                type="button"
                disabled={!replyTexts[comment.id]?.trim() || replySubmitting[comment.id]}
                onClick={() => onSubmitReply(comment.id)}
                style={{
                  padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                  background: accentColor, color: isDark ? '#0B1733' : 'white',
                  border: 'none', cursor: 'pointer', flexShrink: 0,
                  opacity: !replyTexts[comment.id]?.trim() || replySubmitting[comment.id] ? 0.5 : 1,
                }}
              >
                {replySubmitting[comment.id] ? '…' : 'Enviar'}
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Replies recursivas — linha vertical apenas quando há irmãos e o pai não é raiz */}
      {comment.replies.length > 0 && showReplies && (
        <div style={{
          marginTop: 8,
          marginLeft: 14,
          paddingLeft: 22,
          ...(comment.replies.length > 1
            ? { borderLeft: `1.5px solid ${lineColor}` }
            : {}),
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
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

// ── D7 Card ──────────────────────────────────────────────────────────────────
function D7Card({
  idea,
  currentUserId,
  hasValidated,
  hasRejected,
  hybridWeights,
  onValidate,
  onDownvote,
  onClick,
  isDark,
  th,
  readOnly = false,
}: {
  idea: IdeaListItem
  currentUserId: string
  hasValidated: boolean
  hasRejected: boolean
  hybridWeights: { ai: number; social: number }
  onValidate: (id: string) => void
  onDownvote: (id: string) => void
  onClick: (idea: IdeaListItem) => void
  isDark: boolean
  th: Theme
  readOnly?: boolean
}) {
  const d7 = getStatusD7(isDark)[idea.status]
  const isOwn = idea.author_id === currentUserId
  const authorRevealed = idea.status === 'em_implantacao' || idea.status === 'conhecimento_org'
  const hybridScore = Math.round(idea.ai_score * hybridWeights.ai + idea.social_score * hybridWeights.social)

  // Tooltip do score via position:fixed para não ser clipado pelo overflow:hidden do card
  const scoreBadgeRef = useRef<HTMLDivElement>(null)
  const [tipVisible, setTipVisible] = useState(false)
  const [tipStyle, setTipStyle] = useState<React.CSSProperties>({})

  function handleScoreEnter() {
    const rect = scoreBadgeRef.current?.getBoundingClientRect()
    if (rect) {
      setTipStyle({
        position: 'fixed',
        bottom: window.innerHeight - rect.top + 8,
        right: window.innerWidth - rect.right,
      })
    }
    setTipVisible(true)
  }

  return (
    <article
      role="article"
      aria-labelledby={`idea-${idea.id}-title`}
      tabIndex={0}
      onClick={() => onClick(idea)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(idea) }
      }}
      style={{
        background: th.cardBg,
        borderRadius: 18,
        overflow: 'hidden',
        boxShadow: th.cardShadow,
        cursor: 'pointer',
        transition: 'box-shadow .15s',
        position: 'relative',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = th.cardShadowHover }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = th.cardShadow }}
    >
      {/* Faixa de status — fica colada ao topo graças ao overflow:hidden do card */}
      <div style={{ height: 6, background: d7.barColor }} />

      {/* Card body */}
      <div style={{ padding: '26px 28px' }}>
        <div style={{ marginBottom: 10 }}>
          {/* Linha 1: autor + meta + chip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {authorRevealed ? (
              <>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                  background: idea.status === 'conhecimento_org' ? '#1e40af' : '#1d4ed8',
                  color: 'white', fontSize: 10, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {authorInitials(idea.author_name)}
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: th.textSecondary }}>{idea.author_name}</span>
              </>
            ) : (
              <span style={{ color: isDark ? '#D4A000' : BLUE, display: 'flex', alignItems: 'center' }}>
                <Icon name="lock" size={14} />
              </span>
            )}
            <span style={{ fontSize: 13, color: th.textMuted }}>
              <span style={{ opacity: 0.65 }}>Setor:</span>{' '}
              {idea.sector_name}
              <span style={{ opacity: 0.45, margin: '0 5px' }}>·</span>
              <span style={{ opacity: 0.65 }}>Melhoria visando</span>{' '}
              {getImprovementAreaLabel(idea.improvement_area)}
            </span>
            <span style={{
              marginLeft: 'auto', padding: '3px 10px', borderRadius: 100,
              fontSize: 10, fontWeight: 700, background: d7.chipBg, color: d7.chipText, flexShrink: 0,
            }}>
              {d7.label}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, margin: '0 0 12px' }}>
          <h3
            id={`idea-${idea.id}-title`}
            style={{ margin: 0, fontSize: 21, fontWeight: 800, color: th.textPrimary, lineHeight: 1.35, wordBreak: 'break-word', overflowWrap: 'anywhere', flex: 1 }}
          >
            {idea.title}
          </h3>
          <span style={{ fontSize: 11, color: th.textMuted, flexShrink: 0, marginTop: 6 }}>
            {formatDate(idea.created_at)}
          </span>
        </div>

        {idea.summary && (
          <p style={{ margin: '0 0 22px', fontSize: 15, color: th.textSecondary, lineHeight: 1.7, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
            {idea.summary}
          </p>
        )}

        <div
          style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}
          onClick={(e) => e.stopPropagation()}
        >
          {!readOnly && (
            <LikeButton
              score={idea.social_score}
              validated={hasValidated}
              disabled={isOwn}
              onToggle={() => onValidate(idea.id)}
            />
          )}

          {!readOnly && (
            <button
              type="button"
              aria-pressed={hasRejected}
              onClick={(e) => { e.stopPropagation(); onDownvote(idea.id) }}
              title={hasRejected ? 'Remover sinalização' : 'Não é relevante'}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                height: 36, padding: '0 14px', lineHeight: 1,
                background: th.actionBg, color: hasRejected ? '#DC2626' : th.actionColor,
                border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit', transition: 'color .12s', flexShrink: 0,
              }}
            >
              <ThumbDownSvg />
            </button>
          )}

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClick(idea) }}
            aria-label="Ver comentários"
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              height: 36, padding: '0 14px', lineHeight: 1,
              background: th.actionBg, color: th.actionColor,
              border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
            }}
          >
            <CommentSvg />
            {idea.comment_count > 0 ? idea.comment_count : null}
          </button>

          {/* Score badge — tooltip usa position:fixed para escapar do overflow:hidden */}
          <div
            ref={scoreBadgeRef}
            onMouseEnter={handleScoreEnter}
            onMouseLeave={() => setTipVisible(false)}
            style={{ marginLeft: 'auto', cursor: 'help' }}
          >
            <div style={{
              fontSize: 16, fontWeight: 800,
              padding: '6px 14px', borderRadius: 8,
              ...scoreStyle(hybridScore, isDark),
            }}>
              Score: {hybridScore}
            </div>
            {tipVisible && (
              <div style={{
                ...tipStyle,
                background: '#1e293b', color: 'white',
                fontSize: 11, fontWeight: 600,
                padding: '6px 11px', borderRadius: 8,
                whiteSpace: 'nowrap', zIndex: 9999,
                pointerEvents: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,.25)',
              }}>
                🤖 IA: {Math.round(hybridWeights.ai * 100)}% · 👥 Social: {Math.round(hybridWeights.social * 100)}%
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}

// ── Idea Sheet (modal) ───────────────────────────────────────────────────────
function IdeaSheet({
  idea,
  currentUserId,
  userId,
  onClose,
  onValidate,
  onDownvote,
  hybridWeights,
  hasValidated,
  hasRejected,
  onNewComment,
  isDark,
  th,
  readOnly = false,
}: {
  idea: IdeaListItem
  currentUserId: string
  userId: string
  onClose: () => void
  onValidate: (id: string) => void
  onDownvote: (id: string) => void
  hybridWeights: { ai: number; social: number }
  hasValidated: boolean
  hasRejected: boolean
  onNewComment?: (comment: IdeaComment) => void
  isDark: boolean
  th: Theme
  readOnly?: boolean
}) {
  const d7 = getStatusD7(isDark)[idea.status]
  const isOwn = idea.author_id === currentUserId
  const authorRevealed = idea.status === 'em_implantacao' || idea.status === 'conhecimento_org'
  const hybridScore = Math.round(idea.ai_score * hybridWeights.ai + idea.social_score * hybridWeights.social)

  const [comments, setComments]       = useState<IdeaComment[]>(idea.comments)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [tipVisible, setTipVisible]   = useState(false)
  const [replyingTo, setReplyingTo]   = useState<string | null>(null)
  const [replyTexts, setReplyTexts]   = useState<Record<string, string>>({})
  const [replySubmitting, setReplySubmitting] = useState<Record<string, boolean>>({})
  const [likedCommentIds, setLikedCommentIds] = useState<Set<string>>(new Set())
  const [openReplies, setOpenReplies] = useState<Set<string>>(new Set())

  function toggleReplies(commentId: string) {
    setOpenReplies((prev) => {
      const next = new Set(prev)
      if (next.has(commentId)) next.delete(commentId)
      else next.add(commentId)
      return next
    })
  }

  // Busca comentários frescos sempre que o modal abre (garante árvore de replies correta)
  useEffect(() => {
    fetchComments(idea.id).then(setComments).catch(() => {})
  }, [idea.id])

  useEffect(() => {
    if (!userId) return
    fetchUserLikedCommentIds(userId, idea.id)
      .then((ids) => setLikedCommentIds(new Set(ids)))
      .catch(() => {})
  }, [userId, idea.id])

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
    setLikedCommentIds((prev) => {
      const next = new Set(prev)
      if (isLiked) { next.delete(commentId) } else { next.add(commentId) }
      return next
    })
    setComments((prev) => updateLikeCount(prev, commentId, delta))
    try {
      await toggleCommentLike(commentId, userId)
    } catch {
      setLikedCommentIds((prev) => {
        const next = new Set(prev)
        if (isLiked) { next.add(commentId) } else { next.delete(commentId) }
        return next
      })
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
      const newComment = await addComment(idea.id, userId, commentText)
      setComments((prev) => [...prev, newComment])
      onNewComment?.(newComment)
      setCommentText('')
    } catch {
      // silent
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 500 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.45)' }}
        onClick={onClose}
      />

      <div
        style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          width: 'min(780px, 92vw)', maxHeight: '85vh',
          background: th.sheetBg, overflow: 'hidden',
          borderRadius: 18, boxShadow: '0 24px 80px rgba(0,0,0,.28)',
          display: 'flex', flexDirection: 'column',
          border: isDark ? th.sheetBorder : 'none',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          background: th.sheetBg, flexShrink: 0,
          padding: '14px 20px', borderBottom: th.sheetBorder,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {authorRevealed ? (
              <>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: idea.status === 'conhecimento_org' ? '#1e40af' : '#1d4ed8',
                  color: 'white', fontSize: 12, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {authorInitials(idea.author_name)}
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: th.textPrimary }}>{idea.author_name}</span>
              </>
            ) : (
              <>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: th.anonBg,
                  color: isDark ? '#D4A000' : BLUE,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name="lock" size={16} />
                </div>
                <span style={{ fontSize: 13, color: th.textMuted }}>Autor anônimo</span>
              </>
            )}
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              padding: '3px 10px', borderRadius: 100, fontSize: 10, fontWeight: 700,
              background: d7.chipBg, color: d7.chipText,
            }}>
              {d7.label}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: th.textMuted, padding: 4, borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body — scroll único */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>

          {/* Conteúdo da ideia */}
          <div style={{ padding: '20px 20px 0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: th.textMuted, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
              {getImprovementAreaLabel(idea.improvement_area)} · {idea.sector_name}
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: th.textPrimary, lineHeight: 1.3, marginBottom: idea.status === 'em_refinamento' && isOwn ? 12 : 16 }}>
              {idea.title}
            </div>

            {/* Banner de feedback do gestor — só visível para o autor quando em refinamento */}
            {idea.status === 'em_refinamento' && isOwn && idea.rejection_reason && (
              <div style={{
                marginBottom: 20,
                border: `1.5px solid ${isDark ? 'rgba(251,146,60,0.3)' : 'rgba(234,88,12,0.22)'}`,
                borderRadius: 12,
                padding: '14px 16px',
                background: isDark ? 'rgba(251,146,60,0.06)' : 'rgba(251,146,60,0.04)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#f97316' }}>
                    Feedback do gestor
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 14, color: th.textSecondary, lineHeight: 1.65 }}>
                  {idea.rejection_reason}
                </p>
                <p style={{ margin: '8px 0 0', fontSize: 12, color: th.textMuted, lineHeight: 1.6 }}>
                  Agradecemos pela sua contribuição, mas sua ideia não foi aprovada pelo gestor do setor neste momento. Se o feedback acima apontar oportunidades de melhoria, você pode revisar a proposta e submetê-la novamente. Caso contrário, use essa experiência como aprendizado, pois toda ideia contribui para o seu desenvolvimento.
                </p>
              </div>
            )}

            <div style={{ fontSize: 14, color: th.textSecondary, lineHeight: 1.7, marginBottom: 20 }}>
              {idea.summary}
            </div>
            {idea.benefits && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: th.textMuted, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Benefícios</div>
                <div style={{ fontSize: 14, color: th.textSecondary, lineHeight: 1.7 }}>{idea.benefits}</div>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingBottom: 20 }}>
              <div style={{ border: th.metaBlockBorder, borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: th.textMuted, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Complexidade Estimada</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: th.textPrimary }}>{idea.complexity}</div>
              </div>
              <div style={{ border: th.metaBlockBorder, borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: th.textMuted, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Criado em</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: th.textPrimary }}>{formatDate(idea.created_at)}</div>
              </div>
            </div>
          </div>

          {/* Input sticky — fica colado ao topo enquanto comentários rolam abaixo */}
          <div style={{
            position: 'sticky', top: 0, zIndex: 100,
            background: th.sheetBg,
            borderTop: th.sheetBorder,
            borderBottom: th.sheetBorder,
            padding: '14px 20px',
          }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Adicione um comentário..."
                rows={2}
                style={{
                  flex: 1, border: `1.5px solid ${th.textareaBorder}`, borderRadius: 8,
                  padding: '8px 12px', fontSize: 13, fontFamily: 'inherit',
                  resize: 'none', outline: 'none', minHeight: 60,
                  transition: 'border-color .15s',
                  background: th.textareaBg, color: th.textPrimary,
                }}
                onFocus={(e) => { e.target.style.borderColor = BLUE }}
                onBlur={(e) => { e.target.style.borderColor = th.textareaBorder }}
              />
              <button
                type="button"
                disabled={!commentText.trim() || submitting}
                onClick={handleSubmitComment}
                style={{
                  background: isDark ? '#FFC600' : BLUE,
                  color: isDark ? '#0B1733' : 'white',
                  border: 'none', borderRadius: 8,
                  padding: '8px 14px', fontSize: 13, fontWeight: 700,
                  cursor: !commentText.trim() || submitting ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  opacity: !commentText.trim() || submitting ? 0.5 : 1,
                  transition: 'opacity .12s',
                }}
              >
                {submitting ? '...' : 'Enviar'}
              </button>
            </div>
          </div>

          {/* Comentários */}
          <div style={{ padding: '16px 20px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: th.textMuted, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>
              Comentários{comments.length > 0 && ` (${comments.length})`}
            </div>
            {comments.length === 0 ? (
              <div style={{ fontSize: 13, color: th.textMuted }}>Nenhum comentário ainda.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {comments.map((c, idx) => (
                  <Fragment key={c.id}>
                    {idx > 0 && (
                      <div style={{
                        height: 1,
                        background: isDark ? 'rgba(255,255,255,0.06)' : '#f0f4f8',
                        margin: '12px 0',
                      }} />
                    )}
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
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '16px 20px', borderTop: th.sheetBorder,
          background: th.sheetBg, flexShrink: 0,
        }}>
          {!readOnly && (
            <LikeButton
              score={idea.social_score}
              validated={hasValidated}
              disabled={isOwn}
              onToggle={() => onValidate(idea.id)}
            />
          )}

          {!readOnly && (
            <button
              type="button"
              aria-pressed={hasRejected}
              onClick={() => onDownvote(idea.id)}
              title={hasRejected ? 'Remover sinalização' : 'Não é relevante'}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                height: 36, padding: '0 14px', lineHeight: 1,
                background: th.actionBg,
                color: hasRejected ? '#DC2626' : th.actionColor,
                border: 'none', borderRadius: 10,
                fontSize: 14, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'color .12s',
              }}
            >
              <ThumbDownSvg />
            </button>
          )}

          {/* Score com tooltip — o sheet tem overflow:auto, tooltip fica inline aqui */}
          <div
            onMouseEnter={() => setTipVisible(true)}
            onMouseLeave={() => setTipVisible(false)}
            style={{ marginLeft: 'auto', position: 'relative', cursor: 'help' }}
          >
            <div style={{
              fontSize: 16, fontWeight: 800,
              padding: '6px 14px', borderRadius: 8,
              ...scoreStyle(hybridScore, isDark),
            }}>
              Score: {hybridScore}
            </div>
            {tipVisible && (
              <div style={{
                position: 'absolute', bottom: 'calc(100% + 8px)', right: 0,
                background: '#1e293b', color: 'white',
                fontSize: 11, fontWeight: 600,
                padding: '6px 11px', borderRadius: 8,
                whiteSpace: 'nowrap', zIndex: 999,
                pointerEvents: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,.25)',
              }}>
                🤖 IA: {Math.round(hybridWeights.ai * 100)}% · 👥 Social: {Math.round(hybridWeights.social * 100)}%
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
