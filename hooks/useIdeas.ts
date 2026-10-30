'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  fetchDefaultHybridWeights,
  fetchIdeas,
  fetchSectors,
  fetchUserValidatedIdeaIds,
  validateIdea as validateIdeaService,
  unvalidateIdea as unvalidateIdeaService,
  type HybridWeights,
  type IdeaComment,
  type IdeaFilters,
  type IdeaListItem,
  type SectorOption,
} from '@/services/ideasService'
import { applyRejectionPenalty, calculateHybridScoreWithWeights, calculateTimeDecay } from '@/utils/score'

type UseIdeasResult = {
  ideas: IdeaListItem[]
  loading: boolean
  error: string | null
  filters: IdeaFilters
  sectors: SectorOption[]
  hybridWeights: HybridWeights
  validatedIdeaIds: Set<string>
  setHybridWeights: (weights: HybridWeights) => void
  setFilters: (filters: IdeaFilters) => void
  loadIdeas: (filters?: IdeaFilters) => Promise<void>
  validateIdea: (ideaId: string) => Promise<{
    success: boolean
    validated: boolean
    statusChanged?: boolean
    error?: string
  }>
  onCommentAdded: (ideaId: string, comment: IdeaComment) => void
}

function sortIdeasClientSide(
  ideas: IdeaListItem[],
  filters: IdeaFilters,
  hybridWeights: HybridWeights
): IdeaListItem[] {
  const { sortBy, orderBy } = filters

  if (sortBy === 'maior-score') {
    return [...ideas].sort((a, b) => (b.hybrid_score ?? 0) - (a.hybrid_score ?? 0))
  }

  if (sortBy === 'relevancia') {
    const now = Date.now()
    const gravity = 1.8
    return [...ideas].sort((a, b) => {
      const ageA = (now - new Date(a.created_at).getTime()) / 3_600_000
      const ageB = (now - new Date(b.created_at).getTime()) / 3_600_000
      const decayA = applyRejectionPenalty(calculateTimeDecay(a.hybrid_score ?? 0, ageA, gravity), a.rejection_count)
      const decayB = applyRejectionPenalty(calculateTimeDecay(b.hybrid_score ?? 0, ageB, gravity), b.rejection_count)
      return decayB - decayA
    })
  }

  // Legacy orderBy support
  if (orderBy === 'score') {
    return [...ideas].sort((a, b) => {
      const scoreA = applyRejectionPenalty(a.hybrid_score ?? 0, a.rejection_count)
      const scoreB = applyRejectionPenalty(b.hybrid_score ?? 0, b.rejection_count)
      return scoreB - scoreA
    })
  }

  return ideas
}

export function useIdeas(currentUserId?: string | null, initialFilters?: IdeaFilters): UseIdeasResult {
  const [ideas, setIdeas] = useState<IdeaListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtersState, setFiltersState] = useState<IdeaFilters>({ sortBy: 'relevancia', ...initialFilters })
  const [sectors, setSectors] = useState<SectorOption[]>([])
  const [hybridWeights, setHybridWeights] = useState<HybridWeights>({ ai: 0.7, social: 0.3 })
  const [validatedIdeaIds, setValidatedIdeaIds] = useState<Set<string>>(new Set())
  const fetchCounterRef = useRef(0)

  const loadIdeas = useCallback(
    async (nextFilters: IdeaFilters = filtersState) => {
      const myCount = ++fetchCounterRef.current
      setLoading(true)
      setError(null)

      try {
        const data = await fetchIdeas(nextFilters)
        if (myCount !== fetchCounterRef.current) return
        setIdeas(data)
      } catch (err) {
        if (myCount !== fetchCounterRef.current) return
        const message = err instanceof Error ? err.message : 'Erro ao carregar ideias.'
        setError(message)
      } finally {
        if (myCount === fetchCounterRef.current) setLoading(false)
      }
    },
    [filtersState]
  )

  function setFilters(nextFilters: IdeaFilters) {
    const merged = { ...filtersState, ...nextFilters }
    setFiltersState(merged)
    loadIdeas(merged)
  }

  async function handleValidateIdea(ideaId: string) {
    if (!currentUserId) {
      return {
        success: false,
        validated: false,
        error: 'Usuário não autenticado.',
      }
    }

    const isAlreadyValidated = validatedIdeaIds.has(ideaId)
    const delta = isAlreadyValidated ? -1 : 1

    // Optimistic update
    setIdeas((prev) =>
      prev.map((idea) =>
        idea.id === ideaId ? { ...idea, social_score: idea.social_score + delta } : idea
      )
    )
    setValidatedIdeaIds((prev) => {
      const next = new Set(prev)
      if (isAlreadyValidated) next.delete(ideaId)
      else next.add(ideaId)
      return next
    })

    try {
      if (isAlreadyValidated) {
        const result = await unvalidateIdeaService(ideaId, currentUserId)
        setIdeas((prev) =>
          prev.map((idea) =>
            idea.id === ideaId ? { ...idea, social_score: result.newSocialScore } : idea
          )
        )
        return { success: true, validated: false, statusChanged: false }
      } else {
        const result = await validateIdeaService(ideaId, currentUserId)
        setIdeas((prev) =>
          prev.map((idea) =>
            idea.id === ideaId ? { ...idea, social_score: result.newSocialScore } : idea
          )
        )
        if (result.statusChanged) {
          setIdeas((prev) =>
            prev.map((idea) =>
              idea.id === ideaId ? { ...idea, status: 'em_analise' as IdeaListItem['status'] } : idea
            )
          )
        }
        return { success: true, validated: true, statusChanged: result.statusChanged }
      }
    } catch (err) {
      // Silent revert — no error toast per AC3
      setIdeas((prev) =>
        prev.map((idea) =>
          idea.id === ideaId ? { ...idea, social_score: idea.social_score - delta } : idea
        )
      )
      setValidatedIdeaIds((prev) => {
        const next = new Set(prev)
        if (isAlreadyValidated) next.add(ideaId)
        else next.delete(ideaId)
        return next
      })
      return {
        success: false,
        validated: isAlreadyValidated,
        error: err instanceof Error ? err.message : 'Erro ao validar ideia.',
      }
    }
  }

  useEffect(() => {
    let active = true

    async function init() {
      const myCount = ++fetchCounterRef.current
      setLoading(true)
      setError(null)

      try {
        const [weights, sectorData, ideaData] = await Promise.all([
          fetchDefaultHybridWeights(),
          fetchSectors(),
          fetchIdeas(filtersState),
        ])

        if (!active) return
        // weights e sectors são globais — aplicar sempre, independente do fetch ser stale
        setHybridWeights(weights)
        setSectors(sectorData)
        // ideias só aplicam se este ainda é o fetch mais recente
        if (myCount !== fetchCounterRef.current) return
        setIdeas(ideaData)
      } catch (err) {
        if (!active || myCount !== fetchCounterRef.current) return
        const message = err instanceof Error ? err.message : 'Erro ao carregar ideias.'
        setError(message)
      } finally {
        if (active && myCount === fetchCounterRef.current) setLoading(false)
      }
    }

    init()

    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!currentUserId) return
    fetchUserValidatedIdeaIds(currentUserId)
      .then((ids) => setValidatedIdeaIds(new Set(ids)))
      .catch(() => {})
  }, [currentUserId])

  const ideasWithHybrid = useMemo(() => {
    const scored = ideas.map((idea) => ({
      ...idea,
      hybrid_score: calculateHybridScoreWithWeights(
        idea.ai_score,
        idea.social_score,
        hybridWeights
      ),
    }))

    return sortIdeasClientSide(scored, filtersState, hybridWeights)
  }, [filtersState, hybridWeights, ideas])

  function addCommentToIdea(ideaId: string, comment: IdeaComment) {
    setIdeas((prev) =>
      prev.map((idea) =>
        idea.id === ideaId
          ? { ...idea, comment_count: idea.comment_count + 1, comments: [...(idea.comments ?? []), comment] }
          : idea
      )
    )
  }

  return {
    ideas: ideasWithHybrid,
    loading,
    error,
    filters: filtersState,
    sectors,
    hybridWeights,
    validatedIdeaIds,
    setHybridWeights,
    setFilters,
    loadIdeas,
    validateIdea: handleValidateIdea,
    onCommentAdded: addCommentToIdea,
  }
}
