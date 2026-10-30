import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

type UserRow = Database['public']['Tables']['users']['Row']
type IdeaRow = Database['public']['Tables']['ideas']['Row']
type CommentRow = Database['public']['Tables']['comments']['Row']
type SectorRow = Database['public']['Tables']['sectors']['Row']

export type IdeaStatus = 'sugestao' | 'em_analise' | 'em_implantacao' | 'conhecimento_org' | 'em_refinamento'
export type ImprovementArea = 'processo' | 'custo' | 'seguranca' | 'qualidade'
export type IdeaOrder = 'recent' | 'validated' | 'score'
export type SortBy = 'relevancia' | 'maior-score' | 'mais-votados' | 'menos-votados'
export type Period = '7d' | '30d' | '1y' | 'all'
export type FeedTab = 'para-voce' | 'global'

export interface IdeaDoc {
  title: string
  summary: string
  benefits: string
  complexity: string
  ai_score: number
  improvement_area: string
}

export type PublishIdeaData = IdeaDoc & {
  userId: string
  sectorId: string
}

export type HybridWeights = {
  ai: number
  social: number
}

export type IdeaFilters = {
  // Legacy fields (kept for backward compatibility)
  improvementArea?: ImprovementArea | 'all'
  orderBy?: IdeaOrder
  // New Story 1.3 fields
  tab?: FeedTab
  sectorId?: string
  sortBy?: SortBy
  period?: Period
  status?: IdeaStatus | null
  area?: ImprovementArea | null
  search?: string
  page?: number
  pageSize?: number
}

export type IdeaListItem = {
  id: string
  title: string
  summary: string
  benefits: string
  complexity: string
  ai_score: number
  social_score: number
  rejection_count: number
  comment_count: number
  comments: IdeaComment[]
  status: IdeaStatus
  improvement_area: ImprovementArea
  sector_id: string
  sector_name: string
  author_id: string
  author_name: string
  rejected_by: string | null
  rejection_reason: string | null
  created_at: string
  updated_at: string
  hybrid_score?: number
}

export type IdeaComment = {
  id: string
  idea_id: string
  user_id: string
  author_name: string
  content: string
  created_at: string
  parent_id: string | null
  like_count: number
  replies: IdeaComment[]
}

export type IdeaDetail = IdeaListItem & {
  comments: IdeaComment[]
  validated_user_ids: string[]
}

export type SectorOption = Pick<SectorRow, 'id' | 'name' | 'slug'>

export type LeaderboardUser = Pick<
  UserRow,
  'id' | 'name' | 'points' | 'level' | 'is_visible_in_ranking' | 'sector_id'
> & {
  sector_name: string | null
}

export type DashboardData = {
  ideasSubmitted: number
  validationsGiven: number
  coursesCompleted: number
  rankingPosition: number | null
  rankingSectorPosition: number | null
  recentIdeas: IdeaListItem[]
  topUsers: LeaderboardUser[]
}

type IdeaQueryRow = IdeaRow & {
  author: Pick<UserRow, 'id' | 'name'> | null
  sector: Pick<SectorRow, 'id' | 'name'> | null
  idea_rejections: Array<{ count: number }>
  comments: CommentQueryRow[]
}

type CommentQueryRow = {
  id: string
  idea_id: string
  user_id: string
  parent_id: string | null
  content: string
  created_at: string
  author: Pick<UserRow, 'id' | 'name'> | null
  comment_likes: Array<{ user_id: string }>
}

function calculateLevel(points: number): number {
  if (points > 10000) return 5
  if (points >= 5001) return 4
  if (points >= 1501) return 3
  if (points >= 501) return 2
  return 1
}

function parseNumber(value: string | null | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeWeights(ai: number, social: number): HybridWeights {
  const total = ai + social
  if (total <= 0) return { ai: 0.7, social: 0.3 }
  return { ai: ai / total, social: social / total }
}

function mapIdea(row: IdeaQueryRow): IdeaListItem {
  const flat = (row.comments ?? []).map(mapComment)
  const comments = buildCommentTree(flat)
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    benefits: row.benefits,
    complexity: row.complexity,
    ai_score: Number(row.ai_score ?? 0),
    social_score: row.social_score ?? 0,
    rejection_count: Number(row.idea_rejections?.[0]?.count ?? 0),
    comment_count: flat.length,
    comments,
    status: row.status as IdeaStatus,
    improvement_area: row.improvement_area as ImprovementArea,
    sector_id: row.sector_id,
    sector_name: row.sector?.name ?? 'Setor não informado',
    author_id: row.author_id,
    author_name: row.author?.name ?? 'Colaborador',
    rejected_by: row.rejected_by ?? null,
    rejection_reason: row.rejection_reason,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function mapComment(row: CommentQueryRow): IdeaComment {
  return {
    id: row.id,
    idea_id: row.idea_id,
    user_id: row.user_id,
    author_name: row.author?.name ?? 'Colaborador',
    content: row.content,
    created_at: row.created_at,
    parent_id: row.parent_id ?? null,
    like_count: row.comment_likes?.length ?? 0,
    replies: [],
  }
}

function buildCommentTree(flat: IdeaComment[]): IdeaComment[] {
  const map = new Map<string, IdeaComment>()
  for (const c of flat) map.set(c.id, { ...c, replies: [] })

  const roots: IdeaComment[] = []
  for (const c of flat) {
    const node = map.get(c.id)!
    if (c.parent_id) {
      const parent = map.get(c.parent_id)
      if (parent) parent.replies.push(node)
      else roots.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}

async function getSettingNumber(key: string, fallback: number): Promise<number> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle()

  if (error) throw error
  return parseNumber(data?.value, fallback)
}

async function creditUserPoints(
  userId: string,
  points: number,
  actionType: string,
  referenceId?: string | null
): Promise<{ newPoints: number; newLevel: number }> {
  const supabase = createClient()

  const { data: userData, error: fetchError } = await supabase
    .from('users')
    .select('points')
    .eq('id', userId)
    .single()

  if (fetchError) throw fetchError

  const { error: ledgerError } = await supabase.from('point_ledger').insert({
    user_id: userId,
    points,
    action_type: actionType,
    reference_id: referenceId ?? null,
  })

  if (ledgerError) throw ledgerError

  const newPoints = (userData.points ?? 0) + points

  const { data: spentData } = await supabase
    .from('point_ledger')
    .select('points')
    .eq('user_id', userId)
    .lt('points', 0)

  const totalSpent = (spentData ?? []).reduce((sum, row) => sum + Math.abs(row.points), 0)
  const newLevel = calculateLevel(newPoints + totalSpent)

  const { error: updateError } = await supabase
    .from('users')
    .update({ points: newPoints, level: newLevel })
    .eq('id', userId)

  if (updateError) throw updateError

  return { newPoints, newLevel }
}

export async function fetchDefaultHybridWeights(): Promise<HybridWeights> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('platform_settings')
    .select('key, value')
    .in('key', ['hybrid_weight_ai', 'hybrid_weight_social'])

  if (error) throw error

  const ai = parseNumber(data?.find((item) => item.key === 'hybrid_weight_ai')?.value, 0.7)
  const social = parseNumber(data?.find((item) => item.key === 'hybrid_weight_social')?.value, 0.3)

  return normalizeWeights(ai, social)
}

export async function fetchSectors(): Promise<SectorOption[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('sectors')
    .select('id, name, slug')
    .order('name', { ascending: true })

  if (error) throw error
  return (data ?? []) as SectorOption[]
}

export async function fetchIdeas(filters: IdeaFilters = {}): Promise<IdeaListItem[]> {
  const {
    tab = 'global',
    sectorId,
    sortBy,
    period = 'all',
    status,
    area,
    search,
    // Legacy
    improvementArea,
    orderBy,
  } = filters

  const supabase = createClient()
  const needsValidationCount = sortBy === 'menos-votados'

  const commentsSelect = `comments(*, author:users!comments_user_id_fkey(id, name), comment_likes(user_id))`
  const selectFields = needsValidationCount
    ? `*, author:users!ideas_author_id_fkey(id, name), sector:sectors!ideas_sector_id_fkey(id, name), idea_rejections(count), validations(count), ${commentsSelect}`
    : `*, author:users!ideas_author_id_fkey(id, name), sector:sectors!ideas_sector_id_fkey(id, name), idea_rejections(count), ${commentsSelect}`

  let query = supabase.from('ideas').select(selectFields)

  // Sector filter — applies whenever sectorId is explicitly provided
  if (sectorId && sectorId !== 'all') {
    query = query.eq('sector_id', sectorId)
  }

  // Status filter — em_refinamento is always excluded from general feed (private to author)
  if (status) {
    query = query.eq('status', status)
  } else {
    query = query.neq('status', 'em_refinamento')
  }

  // Area filter (new param takes precedence over legacy)
  const effectiveArea = area ?? (improvementArea !== 'all' ? improvementArea : undefined)
  if (effectiveArea) {
    query = query.eq('improvement_area', effectiveArea)
  }

  // Period filter
  if (period !== 'all') {
    const cutoff = new Date()
    if (period === '7d') cutoff.setDate(cutoff.getDate() - 7)
    else if (period === '30d') cutoff.setDate(cutoff.getDate() - 30)
    else if (period === '1y') cutoff.setFullYear(cutoff.getFullYear() - 1)
    query = query.gte('created_at', cutoff.toISOString())
  }

  // Search filter — server-side ilike
  if (search?.trim()) {
    const term = search.trim()
    query = query.or(`title.ilike.%${term}%,summary.ilike.%${term}%`)
  }

  // Server-side ordering
  if (sortBy === 'mais-votados') {
    query = query.order('social_score', { ascending: false })
  } else if (sortBy === 'menos-votados') {
    // No server ordering — will sort client-side by validation COUNT
    query = query.order('created_at', { ascending: false })
  } else if (sortBy === 'maior-score' || sortBy === 'relevancia') {
    // Client-side sort happens in useIdeas; fetch newest first as base
    query = query.order('created_at', { ascending: false })
  } else if (orderBy === 'validated') {
    query = query.order('social_score', { ascending: false })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  const { data, error } = await query
  if (error) throw error

  const rows = (data ?? []) as unknown as Array<IdeaQueryRow & { validations?: [{ count: number }] }>
  let ideas = rows.map(mapIdea)

  // Client-side sort for menos-votados using actual validation COUNT (not social_score)
  if (sortBy === 'menos-votados') {
    const countMap = new Map<string, number>()
    for (const row of rows) {
      countMap.set(row.id, row.validations?.[0]?.count ?? 0)
    }
    ideas = ideas.sort((a, b) => (countMap.get(a.id) ?? 0) - (countMap.get(b.id) ?? 0))
  }

  return ideas
}

export async function fetchMyIdeas(userId: string): Promise<IdeaListItem[]> {
  const supabase = createClient()
  const commentsSelect = `comments(*, author:users!comments_user_id_fkey(id, name), comment_likes(user_id))`
  const { data, error } = await supabase
    .from('ideas')
    .select(`*, author:users!ideas_author_id_fkey(id, name), sector:sectors!ideas_sector_id_fkey(id, name), idea_rejections(count), ${commentsSelect}`)
    .eq('author_id', userId)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return ((data ?? []) as unknown as IdeaQueryRow[]).map(mapIdea)
}

export async function fetchComments(ideaId: string): Promise<IdeaComment[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('comments')
    .select('*, author:users!comments_user_id_fkey(id, name), comment_likes(user_id)')
    .eq('idea_id', ideaId)
    .order('created_at', { ascending: true })

  if (error) throw error
  const flat = ((data ?? []) as unknown as CommentQueryRow[]).map(mapComment)
  return buildCommentTree(flat)
}

export async function fetchUserLikedCommentIds(userId: string, ideaId: string): Promise<string[]> {
  const supabase = createClient()
  const { data: commentData } = await supabase
    .from('comments')
    .select('id')
    .eq('idea_id', ideaId)

  const commentIds = ((commentData ?? []) as Array<{ id: string }>).map((c) => c.id)
  if (!commentIds.length) return []

  const { data: likeData } = await supabase
    .from('comment_likes')
    .select('comment_id')
    .eq('user_id', userId)
    .in('comment_id', commentIds)

  return ((likeData ?? []) as Array<{ comment_id: string }>).map((l) => l.comment_id)
}

export async function toggleCommentLike(
  commentId: string,
  userId: string
): Promise<{ liked: boolean }> {
  const supabase = createClient()

  const { data: existing } = await supabase
    .from('comment_likes')
    .select('id')
    .eq('comment_id', commentId)
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    await supabase.from('comment_likes').delete()
      .eq('comment_id', commentId).eq('user_id', userId)
    return { liked: false }
  }

  await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: userId })
  return { liked: true }
}

export async function fetchIdeaById(id: string): Promise<IdeaDetail | null> {
  const supabase = createClient()

  const { data: ideaData, error: ideaError } = await supabase
    .from('ideas')
    .select(
      `
      *,
      author:users!ideas_author_id_fkey(id, name),
      sector:sectors!ideas_sector_id_fkey(id, name),
      idea_rejections(count)
    `
    )
    .eq('id', id)
    .maybeSingle()

  if (ideaError) throw ideaError
  if (!ideaData) return null

  const [{ data: validationData, error: validationError }, comments] = await Promise.all([
    supabase.from('validations').select('user_id').eq('idea_id', id),
    fetchComments(id),
  ])

  if (validationError) throw validationError

  return {
    ...mapIdea(ideaData as unknown as IdeaQueryRow),
    comments,
    validated_user_ids: (validationData ?? []).map((validation) => validation.user_id),
  }
}

export async function publishIdea(data: PublishIdeaData): Promise<{ id: string }> {
  const supabase = createClient()

  const { data: insertedIdea, error } = await supabase
    .from('ideas')
    .insert({
      title: data.title,
      summary: data.summary,
      benefits: data.benefits,
      complexity: data.complexity,
      ai_score: data.ai_score,
      improvement_area: data.improvement_area,
      author_id: data.userId,
      sector_id: data.sectorId,
      status: 'sugestao',
    })
    .select('id')
    .single()

  if (error) throw error

  return insertedIdea
}

export async function creditPublishPoints(
  userId: string,
  ideaId: string
): Promise<{ newPoints: number; newLevel: number }> {
  const publishPoints = await getSettingNumber('points_publish_idea', 10)
  return creditUserPoints(userId, publishPoints, 'publish_idea', ideaId)
}

export async function fetchUserValidatedIdeaIds(userId: string): Promise<string[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('validations')
    .select('idea_id')
    .eq('user_id', userId)

  if (error) throw error
  return (data ?? []).map((row) => row.idea_id)
}

export async function validateIdea(
  ideaId: string,
  userId: string
): Promise<{ success: true; newSocialScore: number; statusChanged: boolean }> {
  const supabase = createClient()

  // Read settings before any DB writes to prevent partial-write inconsistency
  const minValidations = await getSettingNumber('min_validations_for_analysis', 5).catch(() => 5)

  const { data: idea, error: ideaError } = await supabase
    .from('ideas')
    .select('author_id, social_score, status, title, sector_id')
    .eq('id', ideaId)
    .single()

  if (ideaError) throw ideaError

  if (idea.author_id === userId) {
    throw new Error('Você não pode validar a própria ideia.')
  }

  const { data: existingValidation, error: existingError } = await supabase
    .from('validations')
    .select('id')
    .eq('idea_id', ideaId)
    .eq('user_id', userId)
    .maybeSingle()

  if (existingError) throw existingError

  if (existingValidation) {
    throw new Error('Você já validou esta ideia.')
  }

  // Critical write — propagate on failure
  const { error: validationError } = await supabase.from('validations').insert({
    idea_id: ideaId,
    user_id: userId,
  })

  if (validationError) throw validationError

  const newSocialScore = (idea.social_score ?? 0) + 1
  const statusChanged = idea.status === 'sugestao' && newSocialScore >= minValidations
  const nextStatus = statusChanged ? 'em_analise' : idea.status

  // Critical write — propagate on failure
  const { error: updateIdeaError } = await supabase
    .from('ideas')
    .update({
      social_score: newSocialScore,
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ideaId)

  if (updateIdeaError) throw updateIdeaError

  // Points crediting is secondary — failure must not revert the validation above
  try {
    const validatePoints = await getSettingNumber('points_validate_idea', 5)
    await creditUserPoints(userId, validatePoints, 'validate_idea', ideaId)

    if (statusChanged) {
      const analysisPoints = await getSettingNumber('points_idea_to_analysis', 25)
      await creditUserPoints(idea.author_id, analysisPoints, 'idea_to_analysis', ideaId)
    }
  } catch (err) {
    console.warn('[validateIdea] Points crediting failed — validation still counted:', err)
  }

  if (statusChanged) {
    const { createNotification } = await import('@/services/notificationService')
    const notifyAuthor = createNotification({
      userId: idea.author_id,
      type: 'idea_to_analysis',
      title: 'Sua ideia entrou em análise!',
      body: `"${idea.title}" atingiu validações suficientes e já está na fila do gestor.`,
      href: `/hub?tab=minhas&filter=em_analise&idea=${ideaId}`,
      referenceId: ideaId,
    }).catch(() => null)

    const { data: gestores } = await supabase
      .from('users')
      .select('id')
      .eq('sector_id', idea.sector_id)
      .eq('role', 'gestor')

    const notifyGestores = (gestores ?? []).map((g) =>
      createNotification({
        userId: g.id,
        type: 'new_idea_for_review',
        title: 'Nova ideia para triagem',
        body: `"${idea.title}" entrou em análise e aguarda sua decisão.`,
        href: '/manager/dashboard/hub',
        referenceId: ideaId,
      }).catch(() => null)
    )

    await Promise.all([notifyAuthor, ...notifyGestores])
  }

  return { success: true, newSocialScore, statusChanged }
}

export async function unvalidateIdea(
  ideaId: string,
  userId: string
): Promise<{ success: true; newSocialScore: number }> {
  const supabase = createClient()

  const { data: idea, error: ideaError } = await supabase
    .from('ideas')
    .select('social_score')
    .eq('id', ideaId)
    .single()

  if (ideaError) throw ideaError

  const { error: deleteError } = await supabase
    .from('validations')
    .delete()
    .eq('idea_id', ideaId)
    .eq('user_id', userId)

  if (deleteError) throw deleteError

  const newSocialScore = Math.max(0, (idea.social_score ?? 0) - 1)

  const { error: updateError } = await supabase
    .from('ideas')
    .update({ social_score: newSocialScore, updated_at: new Date().toISOString() })
    .eq('id', ideaId)

  if (updateError) throw updateError

  return { success: true, newSocialScore }
}

export async function addComment(
  ideaId: string,
  userId: string,
  content: string,
  parentId?: string
): Promise<IdeaComment> {
  const supabase = createClient()
  const normalized = content.trim()

  if (!normalized) {
    throw new Error('Comentário vazio.')
  }

  const { data, error } = await supabase
    .from('comments')
    .insert({
      idea_id: ideaId,
      user_id: userId,
      content: normalized,
      parent_id: parentId ?? null,
    })
    .select('*, author:users!comments_user_id_fkey(id, name)')
    .single()

  if (error) throw error
  return mapComment({ ...(data as unknown as CommentQueryRow), comment_likes: [] })
}

export async function fetchLeaderboard(): Promise<LeaderboardUser[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('users')
    .select('id, name, points, level, is_visible_in_ranking, sector_id, sector:sectors!users_sector_id_fkey(name)')
    .eq('role', 'funcionario')
    .eq('is_visible_in_ranking', true)
    .order('points', { ascending: false })

  if (error) throw error

  return ((data ?? []) as unknown as Array<UserRow & { sector: Pick<SectorRow, 'name'> | null }>).map(
    (user) => ({
      id: user.id,
      name: user.name,
      points: user.points,
      level: user.level,
      is_visible_in_ranking: user.is_visible_in_ranking,
      sector_id: user.sector_id,
      sector_name: user.sector?.name ?? null,
    })
  )
}

export async function updateRankingVisibility(
  userId: string,
  visible: boolean
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('users')
    .update({ is_visible_in_ranking: visible })
    .eq('id', userId)

  if (error) throw error
}

export async function fetchEmployeeDashboardData(
  userId: string,
  sectorId: string | null
): Promise<DashboardData> {
  const supabase = createClient()

  const [
    submitted,
    validations,
    courses,
    recentIdeas,
    ranking,
  ] = await Promise.all([
    supabase.from('ideas').select('id', { count: 'exact', head: true }).eq('author_id', userId),
    supabase.from('validations').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('quiz_completions').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('passed', true),
    fetchIdeas({ sectorId: sectorId ?? undefined, orderBy: 'recent' }),
    fetchLeaderboard(),
  ])

  if (submitted.error) throw submitted.error
  if (validations.error) throw validations.error
  if (courses.error) throw courses.error

  const sectorRanking = sectorId
    ? ranking.filter((person) => person.sector_id === sectorId)
    : ranking
  const rankingPosition = ranking.findIndex((person) => person.id === userId)
  const rankingSectorPosition = sectorId
    ? sectorRanking.findIndex((person) => person.id === userId)
    : rankingPosition

  return {
    ideasSubmitted: submitted.count ?? 0,
    validationsGiven: validations.count ?? 0,
    coursesCompleted: courses.count ?? 0,
    rankingPosition: rankingPosition >= 0 ? rankingPosition + 1 : null,
    rankingSectorPosition: rankingSectorPosition >= 0 ? rankingSectorPosition + 1 : null,
    recentIdeas: recentIdeas.slice(0, 4),
    topUsers: sectorRanking.slice(0, 5),
  }
}
