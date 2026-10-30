import { createClient } from '@/lib/supabase/client'
import type { Database, Json } from '@/types/database.types'
import { createNotification } from '@/services/notificationService'
import { calculateHybridScoreWithWeights } from '@/utils/score'
import type { IdeaListItem, IdeaComment, IdeaStatus, ImprovementArea } from '@/services/ideasService'

type UserRow = Database['public']['Tables']['users']['Row']
type UserUpdate = Database['public']['Tables']['users']['Update']
type SectorRow = Database['public']['Tables']['sectors']['Row']
type IdeaRow = Database['public']['Tables']['ideas']['Row']
type CourseRow = Database['public']['Tables']['courses']['Row']
type CourseInsert = Database['public']['Tables']['courses']['Insert']
type CourseUpdate = Database['public']['Tables']['courses']['Update']
type QuizRow = Database['public']['Tables']['quizzes']['Row']
type MentorProfileRow = Database['public']['Tables']['mentor_profiles']['Row']
type ModerationAlertRow = Database['public']['Tables']['moderation_alerts']['Row']

export type Role = 'funcionario' | 'gestor' | 'admin'

export type AdminUser = UserRow & {
  sector_name: string | null
  ideas_count: number
}

export type ManagerDashboardData = {
  awaitingAnalysis: number
  totalIdeas: number
  approvedThisMonth: number
  averageAiScore: number
  gerouValor: number
  conversionRate: number
  topUsers: Array<Pick<UserRow, 'id' | 'name' | 'points' | 'level'> & { sector_name: string | null }>
  hotIdeas: Array<IdeaRow & { sector_name: string | null; hybrid_score: number }>
  pendingMentors: number
  categoryCounts: Array<{ name: string; count: number; pct: number; color: string }>
  pipelineCounts: Array<{ status: string; label: string; count: number; color: string }>
}

export type AdminDashboardData = {
  totalUsers: number
  totalIdeas: number
  pendingAlerts: number
  pointsDistributed: number
  statusCounts: Array<{ status: string; label: string; count: number; pct: number; color: string }>
  recentLedger: Array<{
    id: string
    user_id: string
    label: string
    user_name: string
    points: number
    created_at: string
  }>
}

export type ManagerMentorProfile = MentorProfileRow & {
  user_name: string
  user_email: string | null
  sector_name: string | null
}

export type ManagerMentorshipsData = {
  pendingApplications: ManagerMentorProfile[]
  activeMentors: ManagerMentorProfile[]
}

export type AdminCourse = CourseRow & {
  sector_name: string | null
  quizzes: QuizQuestion[]
}

export type QuizQuestion = Omit<QuizRow, 'options'> & {
  options: string[]
}

export type AdminContentData = {
  courses: AdminCourse[]
  sectors: SectorRow[]
}

export type ModerationAlert = ModerationAlertRow & {
  user_name: string
  user_email: string | null
}

export type PlatformSettings = Record<string, string>

type UserWithSector = UserRow & {
  sector: Pick<SectorRow, 'name'> | null
}

type IdeaWithSector = IdeaRow & {
  sector: Pick<SectorRow, 'name'> | null
}

type LedgerWithUser = Database['public']['Tables']['point_ledger']['Row'] & {
  user: Pick<UserRow, 'name'> | null
}

type MentorProfileQueryRow = MentorProfileRow & {
  user: Pick<UserRow, 'name' | 'email'> | null
  sector: Pick<SectorRow, 'name'> | null
}

type CourseQueryRow = CourseRow & {
  sector: Pick<SectorRow, 'name'> | null
}

type ModerationAlertQueryRow = ModerationAlertRow & {
  user: Pick<UserRow, 'name' | 'email'> | null
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  sugestao: { label: 'Sugestao', color: '#d97706' },
  em_analise: { label: 'Em analise', color: '#4f46e5' },
  em_implantacao: { label: 'Em implantacao', color: '#059669' },
  conhecimento_org: { label: 'Gerou valor', color: '#16a34a' },
}

const AREA_META: Record<string, { label: string; color: string }> = {
  processo: { label: 'Processo', color: '#7c3aed' },
  custo: { label: 'Custo', color: '#0057a8' },
  seguranca: { label: 'Seguranca', color: '#0284c7' },
  qualidade: { label: 'Qualidade', color: '#059669' },
}

const ACTION_LABELS: Record<string, string> = {
  publish_idea: 'Ideia publicada',
  idea_to_analysis: 'Ideia entrou em analise',
  idea_approved: 'Ideia aprovada',
  idea_knowledge: 'Ideia em conhecimento organizacional',
  complete_course: 'Curso concluido',
  complete_quiz: 'Quiz concluido',
  give_mentorship: 'Mentoria conduzida',
  receive_mentorship: 'Mentoria recebida',
  validate_idea: 'Ideia validada',
  redeem_item: 'Beneficio resgatado',
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

function parseOptions(options: Json): string[] {
  return Array.isArray(options) ? options.map(String) : []
}

function normalizePercent(count: number, total: number) {
  if (total <= 0) return 0
  return Math.max(6, Math.round((count / total) * 100))
}

function monthStartIso() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
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
  referenceId: string
): Promise<void> {
  const supabase = createClient()

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('points')
    .eq('id', userId)
    .single()

  if (userError) throw userError

  const { error: ledgerError } = await supabase.from('point_ledger').insert({
    user_id: userId,
    points,
    action_type: actionType,
    reference_id: referenceId,
  })

  if (ledgerError) throw ledgerError

  const newPoints = (user.points ?? 0) + points

  const { data: spentData } = await supabase
    .from('point_ledger')
    .select('points')
    .eq('user_id', userId)
    .lt('points', 0)

  const totalSpent = (spentData ?? []).reduce((sum, row) => sum + Math.abs(row.points), 0)

  const { error: updateError } = await supabase
    .from('users')
    .update({ points: newPoints, level: calculateLevel(newPoints + totalSpent) })
    .eq('id', userId)

  if (updateError) throw updateError
}

async function assertSameSector(ideaId: string, gestorId: string): Promise<IdeaRow> {
  const supabase = createClient()
  const [ideaResult, gestorResult] = await Promise.all([
    supabase.from('ideas').select('*').eq('id', ideaId).single(),
    supabase.from('users').select('sector_id, role').eq('id', gestorId).single(),
  ])

  if (ideaResult.error) throw ideaResult.error
  if (gestorResult.error) throw gestorResult.error
  if (gestorResult.data.role !== 'gestor' && gestorResult.data.role !== 'admin') {
    throw new Error('Usuario sem permissao de gestor.')
  }
  if (gestorResult.data.role === 'gestor' && gestorResult.data.sector_id !== ideaResult.data.sector_id) {
    throw new Error('Gestor nao pode atuar em ideias de outro setor.')
  }

  return ideaResult.data
}

export async function approveIdea(
  ideaId: string,
  gestorId: string
): Promise<{ success: true; newIdeaStatus: string }> {
  const supabase = createClient()
  const idea = await assertSameSector(ideaId, gestorId)

  if (idea.status === 'em_implantacao' || idea.status === 'conhecimento_org') {
    return { success: true, newIdeaStatus: idea.status }
  }

  const { error } = await supabase
    .from('ideas')
    .update({
      status: 'em_implantacao',
      approved_by: gestorId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ideaId)

  if (error) throw error

  const points = await getSettingNumber('points_idea_approved', 100)
  await creditUserPoints(idea.author_id, points, 'idea_approved', ideaId)

  await createNotification({
    userId: idea.author_id,
    type: 'idea_approved',
    title: 'Sua ideia foi aprovada! 🎉',
    body: `"${idea.title}" entrou em fase de implantação. Parabéns!`,
    href: `/hub?tab=minhas&filter=em_implantacao&idea=${ideaId}`,
    referenceId: ideaId,
  }).catch(() => null)

  return { success: true, newIdeaStatus: 'em_implantacao' }
}

export async function rejectIdea(
  ideaId: string,
  gestorId: string,
  rejectionReason: string
): Promise<{ success: true }> {
  const reason = rejectionReason.trim()
  if (!reason) throw new Error('Informe uma justificativa.')

  const supabase = createClient()
  const idea = await assertSameSector(ideaId, gestorId)

  const { error } = await supabase
    .from('ideas')
    .update({
      status: 'em_refinamento',
      rejected_by: gestorId,
      rejection_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ideaId)

  if (error) throw error

  await createNotification({
    userId: idea.author_id,
    type: 'idea_rejected',
    title: 'Sua ideia não foi aprovada',
    body: reason,
    href: `/hub?tab=minhas&filter=em_refinamento&idea=${ideaId}`,
    referenceId: ideaId,
  })

  return { success: true }
}

export async function moveToKnowledge(
  ideaId: string,
  gestorId: string
): Promise<{ success: true; newIdeaStatus: string }> {
  const supabase = createClient()
  const idea = await assertSameSector(ideaId, gestorId)

  if (idea.status === 'conhecimento_org') {
    return { success: true, newIdeaStatus: 'conhecimento_org' }
  }

  const { error } = await supabase
    .from('ideas')
    .update({
      status: 'conhecimento_org',
      updated_at: new Date().toISOString(),
    })
    .eq('id', ideaId)

  if (error) throw error

  const points = await getSettingNumber('points_idea_knowledge', 250)
  await creditUserPoints(idea.author_id, points, 'idea_knowledge', ideaId)

  await createNotification({
    userId: idea.author_id,
    type: 'idea_knowledge',
    title: 'Sua ideia Gerou Valor!',
    body: `"${idea.title}" foi reconhecida como conhecimento organizacional da empresa.`,
    href: `/hub?tab=minhas&filter=conhecimento_org&idea=${ideaId}`,
    referenceId: ideaId,
  }).catch(() => null)

  return { success: true, newIdeaStatus: 'conhecimento_org' }
}

export async function fetchManagerDashboardData(
  managerSectorId?: string | null
): Promise<ManagerDashboardData> {
  const supabase = createClient()
  const [ideasResult, usersResult, pendingMentorsResult, weightsResult] = await Promise.all([
    supabase
      .from('ideas')
      .select('*, sector:sectors!ideas_sector_id_fkey(name)')
      .order('updated_at', { ascending: false }),
    supabase
      .from('users')
      .select('*, sector:sectors!users_sector_id_fkey(name)')
      .order('points', { ascending: false })
      .limit(5),
    supabase
      .from('mentor_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('platform_settings')
      .select('key, value')
      .in('key', ['hybrid_weight_ai', 'hybrid_weight_social']),
  ])

  if (ideasResult.error) throw ideasResult.error
  if (usersResult.error) throw usersResult.error
  if (pendingMentorsResult.error) throw pendingMentorsResult.error
  if (weightsResult.error) throw weightsResult.error

  const allIdeas = ((ideasResult.data ?? []) as unknown as IdeaWithSector[])
  const scopedIdeas = managerSectorId
    ? allIdeas.filter((idea) => idea.sector_id === managerSectorId)
    : allIdeas
  const ai = parseNumber(weightsResult.data?.find((item) => item.key === 'hybrid_weight_ai')?.value, 0.7)
  const social = parseNumber(weightsResult.data?.find((item) => item.key === 'hybrid_weight_social')?.value, 0.3)
  const monthStart = monthStartIso()

  const categories = Object.entries(AREA_META).map(([key, meta]) => {
    const count = scopedIdeas.filter((idea) => idea.improvement_area === key).length
    return {
      name: meta.label,
      count,
      pct: normalizePercent(count, scopedIdeas.length),
      color: meta.color,
    }
  })

  const hotIdeas = scopedIdeas
    .filter((idea) => idea.social_score >= 5 || idea.updated_at.slice(0, 10) === new Date().toISOString().slice(0, 10))
    .map((idea) => ({
      ...idea,
      sector_name: idea.sector?.name ?? null,
      hybrid_score: calculateHybridScoreWithWeights(Number(idea.ai_score ?? 0), idea.social_score ?? 0, { ai, social }),
    }))
    .sort((a, b) => b.hybrid_score - a.hybrid_score)
    .slice(0, 6)

  const gerouValor = scopedIdeas.filter((idea) => idea.status === 'conhecimento_org').length
  const analyzed = scopedIdeas.filter((idea) => idea.status === 'em_analise' || idea.status === 'em_implantacao' || idea.status === 'conhecimento_org').length
  const approved = scopedIdeas.filter((idea) => idea.status === 'em_implantacao' || idea.status === 'conhecimento_org').length
  const conversionRate = analyzed > 0 ? Math.round((approved / analyzed) * 100) : 0

  const pipelineCounts = [
    { status: 'sugestao',         label: 'Sugestões',      color: '#d97706', count: scopedIdeas.filter((i) => i.status === 'sugestao').length },
    { status: 'em_analise',       label: 'Em análise',     color: '#4f46e5', count: scopedIdeas.filter((i) => i.status === 'em_analise').length },
    { status: 'em_implantacao',   label: 'Em implantação', color: '#0284c7', count: scopedIdeas.filter((i) => i.status === 'em_implantacao').length },
    { status: 'conhecimento_org', label: 'Gerou Valor',    color: '#16a34a', count: scopedIdeas.filter((i) => i.status === 'conhecimento_org').length },
    { status: 'em_refinamento',   label: 'Não aprovadas',  color: '#dc2626', count: scopedIdeas.filter((i) => i.status === 'em_refinamento').length },
  ]

  return {
    awaitingAnalysis: scopedIdeas.filter((idea) => idea.status === 'em_analise').length,
    totalIdeas: scopedIdeas.length,
    approvedThisMonth: scopedIdeas.filter(
      (idea) =>
        (idea.status === 'em_implantacao' || idea.status === 'conhecimento_org') &&
        idea.updated_at >= monthStart
    ).length,
    averageAiScore: Math.round(
      scopedIdeas.reduce((sum, idea) => sum + Number(idea.ai_score ?? 0), 0) /
        Math.max(scopedIdeas.length, 1)
    ),
    gerouValor,
    conversionRate,
    topUsers: ((usersResult.data ?? []) as unknown as UserWithSector[]).map((item) => ({
      id: item.id,
      name: item.name,
      points: item.points,
      level: item.level,
      sector_name: item.sector?.name ?? null,
    })),
    hotIdeas,
    pendingMentors: pendingMentorsResult.count ?? 0,
    categoryCounts: categories,
    pipelineCounts,
  }
}

export async function fetchAdminDashboardData(): Promise<AdminDashboardData> {
  const supabase = createClient()
  const [usersResult, ideasResult, alertsResult, ledgerResult] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('ideas').select('status'),
    supabase
      .from('moderation_alerts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('point_ledger')
      .select('*, user:users!point_ledger_user_id_fkey(name)')
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  if (usersResult.error) throw usersResult.error
  if (ideasResult.error) throw ideasResult.error
  if (alertsResult.error) throw alertsResult.error
  if (ledgerResult.error) throw ledgerResult.error

  const ideas = ideasResult.data ?? []
  const totalIdeas = ideas.length
  const statusCounts = Object.entries(STATUS_META).map(([status, meta]) => {
    const count = ideas.filter((idea) => idea.status === status).length
    return { status, label: meta.label, count, pct: normalizePercent(count, totalIdeas), color: meta.color }
  })
  const ledger = ((ledgerResult.data ?? []) as unknown as LedgerWithUser[])

  return {
    totalUsers: usersResult.count ?? 0,
    totalIdeas,
    pendingAlerts: alertsResult.count ?? 0,
    pointsDistributed: ledger.reduce((sum, item) => sum + Math.max(item.points, 0), 0),
    statusCounts,
    recentLedger: ledger.map((item) => ({
      id: item.id,
      user_id: item.user_id as string,
      label: ACTION_LABELS[item.action_type] ?? item.action_type,
      user_name: item.user?.name ?? 'Usuario',
      points: item.points,
      created_at: item.created_at,
    })),
  }
}

export type UserPointLogEntry = {
  id: string
  label: string
  points: number
  created_at: string
}

export async function fetchUserPointLog(userId: string): Promise<UserPointLogEntry[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('point_ledger')
    .select('id, action_type, points, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return (data ?? []).map((item) => ({
    id: item.id as string,
    label: ACTION_LABELS[item.action_type as string] ?? (item.action_type as string),
    points: item.points as number,
    created_at: item.created_at as string,
  }))
}

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const supabase = createClient()
  const [usersResult, ideasResult] = await Promise.all([
    supabase
      .from('users')
      .select('*, sector:sectors!users_sector_id_fkey(name)')
      .order('created_at', { ascending: false }),
    supabase.from('ideas').select('author_id'),
  ])

  if (usersResult.error) throw usersResult.error
  if (ideasResult.error) throw ideasResult.error

  const counts = (ideasResult.data ?? []).reduce<Record<string, number>>((acc, idea) => {
    acc[idea.author_id] = (acc[idea.author_id] ?? 0) + 1
    return acc
  }, {})

  return ((usersResult.data ?? []) as unknown as UserWithSector[]).map((item) => ({
    ...item,
    sector_name: item.sector?.name ?? null,
    ideas_count: counts[item.id] ?? 0,
  }))
}

export async function updateAdminUser(userId: string, values: UserUpdate): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('users').update(values).eq('id', userId)
  if (error) throw error
}

function mapMentor(row: MentorProfileQueryRow): ManagerMentorProfile {
  return {
    id: row.id,
    user_id: row.user_id,
    knowledge_area: row.knowledge_area,
    sector_id: row.sector_id,
    status: row.status,
    validated_by: row.validated_by,
    created_at: row.created_at,
    user_name: row.user?.name ?? 'Mentor',
    user_email: row.user?.email ?? null,
    sector_name: row.sector?.name ?? null,
  }
}

export async function fetchPendingMentorApplications(): Promise<ManagerMentorProfile[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('mentor_profiles')
    .select('*, user:users!mentor_profiles_user_id_fkey(name, email), sector:sectors!mentor_profiles_sector_id_fkey(name)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) throw error
  return ((data ?? []) as unknown as MentorProfileQueryRow[]).map(mapMentor)
}

export async function fetchActiveMentorProfiles(): Promise<ManagerMentorProfile[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('mentor_profiles')
    .select('*, user:users!mentor_profiles_user_id_fkey(name, email), sector:sectors!mentor_profiles_sector_id_fkey(name)')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) throw error
  return ((data ?? []) as unknown as MentorProfileQueryRow[]).map(mapMentor)
}

export async function fetchManagerMentorships(): Promise<ManagerMentorshipsData> {
  const [pendingApplications, activeMentors] = await Promise.all([
    fetchPendingMentorApplications(),
    fetchActiveMentorProfiles(),
  ])

  return { pendingApplications, activeMentors }
}

export async function approveMentorApplication(
  mentorProfileId: string,
  gestorId: string
): Promise<void> {
  const supabase = createClient()
  const { data: profile, error: profileError } = await supabase
    .from('mentor_profiles')
    .select('user_id')
    .eq('id', mentorProfileId)
    .single()

  if (profileError) throw profileError

  const { error: updateProfileError } = await supabase
    .from('mentor_profiles')
    .update({ status: 'active', validated_by: gestorId })
    .eq('id', mentorProfileId)

  if (updateProfileError) throw updateProfileError

  const { error: updateUserError } = await supabase
    .from('users')
    .update({ is_mentor: true })
    .eq('id', profile.user_id)

  if (updateUserError) throw updateUserError
}

export async function rejectMentorApplication(mentorProfileId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('mentor_profiles').delete().eq('id', mentorProfileId)
  if (error) throw error
}

export async function removeMentorStatus(userId: string): Promise<void> {
  const supabase = createClient()
  const [userResult, profileResult] = await Promise.all([
    supabase.from('users').update({ is_mentor: false }).eq('id', userId),
    supabase
      .from('mentor_profiles')
      .delete()
      .eq('user_id', userId),
  ])

  if (userResult.error) throw userResult.error
  if (profileResult.error) throw profileResult.error
}

export async function fetchPlatformSettings(): Promise<PlatformSettings> {
  const supabase = createClient()
  const { data, error } = await supabase.from('platform_settings').select('key, value')

  if (error) throw error
  return (data ?? []).reduce<PlatformSettings>((acc, item) => {
    acc[item.key] = item.value
    return acc
  }, {})
}

export async function updatePlatformSettings(settings: PlatformSettings): Promise<void> {
  const supabase = createClient()
  const rows = Object.entries(settings).map(([key, value]) => ({
    key,
    value,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await supabase.from('platform_settings').upsert(rows, { onConflict: 'key' })
  if (error) throw error
}

export async function fetchAdminContent(): Promise<AdminContentData> {
  const supabase = createClient()
  const [coursesResult, quizzesResult, sectorsResult] = await Promise.all([
    supabase
      .from('courses')
      .select('*, sector:sectors!courses_sector_id_fkey(name)')
      .order('created_at', { ascending: false }),
    supabase.from('quizzes').select('*').order('created_at', { ascending: true }),
    supabase.from('sectors').select('*').order('name', { ascending: true }),
  ])

  if (coursesResult.error) throw coursesResult.error
  if (quizzesResult.error) throw quizzesResult.error
  if (sectorsResult.error) throw sectorsResult.error

  const quizzes = ((quizzesResult.data ?? []) as QuizRow[]).map<QuizQuestion>((quiz) => ({
    ...quiz,
    options: parseOptions(quiz.options),
  }))

  const courses = ((coursesResult.data ?? []) as unknown as CourseQueryRow[]).map((course) => ({
    id: course.id,
    title: course.title,
    description: course.description,
    content: course.content,
    thumbnail_url: course.thumbnail_url,
    sector_id: course.sector_id,
    created_at: course.created_at,
    sector_name: course.sector?.name ?? null,
    quizzes: quizzes.filter((quiz) => quiz.course_id === course.id),
  }))

  return {
    courses,
    sectors: sectorsResult.data ?? [],
  }
}

export async function createCourse(values: CourseInsert): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('courses').insert(values)
  if (error) throw error
}

export async function updateCourse(courseId: string, values: CourseUpdate): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('courses').update(values).eq('id', courseId)
  if (error) throw error
}

export async function deleteCourse(courseId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('courses').delete().eq('id', courseId)
  if (error) throw error
}

export async function createQuiz(values: {
  course_id: string
  question: string
  options: string[]
  correct_answer: number
}): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('quizzes').insert({
    course_id: values.course_id,
    question: values.question,
    options: values.options,
    correct_answer: values.correct_answer,
  })

  if (error) throw error
}

export async function updateQuiz(quizId: string, values: {
  question: string
  options: string[]
  correct_answer: number
}): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('quizzes').update({
    question: values.question,
    options: values.options,
    correct_answer: values.correct_answer,
  }).eq('id', quizId)
  if (error) throw error
}

export async function deleteQuiz(quizId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('quizzes').delete().eq('id', quizId)
  if (error) throw error
}

export async function createSector(values: { name: string; slug: string }): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('sectors').insert(values)
  if (error) throw error
}

export async function updateSector(sectorId: string, values: { name: string; slug: string }): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('sectors').update(values).eq('id', sectorId)
  if (error) throw error
}

export async function deleteSector(sectorId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('sectors').delete().eq('id', sectorId)
  if (error) throw error
}

export async function fetchModerationAlerts(status?: string): Promise<ModerationAlert[]> {
  const supabase = createClient()
  let query = supabase
    .from('moderation_alerts')
    .select('*, user:users!moderation_alerts_user_id_fkey(name, email)')
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) throw error

  return ((data ?? []) as unknown as ModerationAlertQueryRow[]).map((alert) => ({
    ...alert,
    user_name: alert.user?.name ?? 'Usuario',
    user_email: alert.user?.email ?? null,
  }))
}

export async function updateModerationAlertStatus(
  alertId: string,
  status: 'pending' | 'warned' | 'blocked'
): Promise<void> {
  const supabase = createClient()

  // Bloqueio real de acesso em producao requer supabaseAdmin.auth.admin.updateUser.
  const { error } = await supabase.from('moderation_alerts').update({ status }).eq('id', alertId)
  if (error) throw error
}

type ApprovedIdeaQueryRow = {
  id: string; title: string; summary: string; benefits: string; complexity: string
  ai_score: string | number | null; social_score: number | null
  status: string; improvement_area: string; sector_id: string; author_id: string
  rejection_reason: string | null; created_at: string; updated_at: string
  author: { id: string; name: string } | null
  sector: { id: string; name: string } | null
  idea_rejections: Array<{ count: number }>
  comments: Array<{
    id: string; idea_id: string; user_id: string; parent_id: string | null
    content: string; created_at: string
    author: { id: string; name: string } | null
    comment_likes: Array<{ user_id: string }>
  }>
}

function buildApprovedCommentTree(flat: IdeaComment[]): IdeaComment[] {
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

export async function fetchRefinedByManager(managerId: string): Promise<IdeaListItem[]> {
  const supabase = createClient()

  const { data: managerRow } = await supabase
    .from('users')
    .select('sector_id')
    .eq('id', managerId)
    .single()

  let query = supabase
    .from('ideas')
    .select(`
      *,
      author:users!ideas_author_id_fkey(id, name),
      sector:sectors!ideas_sector_id_fkey(id, name),
      idea_rejections(count),
      comments(*, author:users!comments_user_id_fkey(id, name), comment_likes(user_id))
    `)
    .eq('rejected_by', managerId)

  if (managerRow?.sector_id) {
    query = query.eq('sector_id', managerRow.sector_id) as typeof query
  }

  const { data, error } = await query.order('updated_at', { ascending: false })

  if (error) throw error

  return ((data ?? []) as unknown as ApprovedIdeaQueryRow[]).map((row) => {
    const flat = (row.comments ?? []).map((c) => ({
      id: c.id, idea_id: c.idea_id, user_id: c.user_id,
      author_name: c.author?.name ?? 'Colaborador',
      content: c.content, created_at: c.created_at,
      parent_id: c.parent_id ?? null, like_count: c.comment_likes?.length ?? 0,
      replies: [] as IdeaComment[],
    }))
    const comments = buildApprovedCommentTree(flat)
    return {
      id: row.id, title: row.title, summary: row.summary,
      benefits: row.benefits, complexity: row.complexity,
      ai_score: Number(row.ai_score ?? 0), social_score: row.social_score ?? 0,
      rejection_count: Number(row.idea_rejections?.[0]?.count ?? 0),
      comment_count: flat.length, comments,
      status: row.status as IdeaStatus, improvement_area: row.improvement_area as ImprovementArea,
      sector_id: row.sector_id, sector_name: row.sector?.name ?? 'Setor não informado',
      author_id: row.author_id, author_name: row.author?.name ?? 'Colaborador',
      rejected_by: managerId, rejection_reason: row.rejection_reason,
      created_at: row.created_at, updated_at: row.updated_at,
    }
  })
}

export type ManagerMetricsData = {
  statusCounts: Array<{ status: string; label: string; count: number; color: string; barColor: string }>
  areaCounts: Array<{ area: string; label: string; count: number; pct: number; avgAiScore: number; avgSocialScore: number; color: string }>
  successCases: Array<{ id: string; title: string; summary: string | null; author_name: string; improvement_area: string; updated_at: string; ai_score: number; social_score: number }>
  monthlyTrend: Array<{ key: string; label: string; count: number }>
  conversionRate: number
  totalIdeas: number
  awaitingAnalysis: number
  gerouValor: number
  topContributors: Array<{ id: string; name: string; ideaCount: number; approvedCount: number; points: number }>
}

type RawIdeaForMetrics = {
  id: string; title: string; summary: string | null; status: string; improvement_area: string
  ai_score: string | number | null; social_score: number | null; created_at: string; updated_at: string
  author_id: string
  author: { id: string; name: string } | null
}

type TopContributorRaw = {
  id: string; name: string; points: number
}

export async function fetchManagerMetrics(managerSectorId?: string | null): Promise<ManagerMetricsData> {
  const supabase = createClient()

  let query = supabase
    .from('ideas')
    .select('id, title, summary, status, improvement_area, ai_score, social_score, created_at, updated_at, author_id, author:users!ideas_author_id_fkey(id, name)')
    .order('created_at', { ascending: false })

  if (managerSectorId) query = query.eq('sector_id', managerSectorId) as typeof query

  const { data: rawIdeas, error: ideasError } = await query
  if (ideasError) throw ideasError

  const ideas = (rawIdeas ?? []) as unknown as RawIdeaForMetrics[]

  // ── Status counts ──
  const STATUS_DISPLAY: Array<{ status: string; label: string; color: string; barColor: string }> = [
    { status: 'sugestao',         label: 'Sugestões',        color: '#d97706', barColor: 'rgba(217,119,6,0.15)'    },
    { status: 'em_analise',       label: 'Em análise',       color: '#4f46e5', barColor: 'rgba(79,70,229,0.15)'    },
    { status: 'em_implantacao',   label: 'Em implantação',   color: '#0284c7', barColor: 'rgba(2,132,199,0.15)'    },
    { status: 'conhecimento_org', label: 'Gerou Valor',      color: '#16a34a', barColor: 'rgba(22,163,74,0.15)'    },
    { status: 'em_refinamento',   label: 'Não aprovadas',    color: '#dc2626', barColor: 'rgba(220,38,38,0.12)'    },
  ]

  const statusCounts = STATUS_DISPLAY.map((s) => ({
    ...s,
    count: ideas.filter((i) => i.status === s.status).length,
  }))

  // ── Area counts ──
  const AREA_DISPLAY: Array<{ area: string; label: string; color: string }> = [
    { area: 'processo',  label: 'Processo',  color: '#7c3aed' },
    { area: 'custo',     label: 'Custo',     color: '#0057a8' },
    { area: 'seguranca', label: 'Segurança', color: '#0284c7' },
    { area: 'qualidade', label: 'Qualidade', color: '#059669' },
  ]

  const areaCounts = AREA_DISPLAY.map(({ area, label, color }) => {
    const filtered = ideas.filter((i) => i.improvement_area === area)
    const avgAiScore = filtered.length > 0
      ? Math.round(filtered.reduce((sum, i) => sum + Number(i.ai_score ?? 0), 0) / filtered.length)
      : 0
    const avgSocialScore = filtered.length > 0
      ? Math.round(filtered.reduce((sum, i) => sum + (i.social_score ?? 0), 0) / filtered.length)
      : 0
    const pct = ideas.length > 0 ? Math.max(4, Math.round((filtered.length / ideas.length) * 100)) : 0
    return { area, label, count: filtered.length, pct, avgAiScore, avgSocialScore, color }
  })

  // ── Success cases ──
  const successCases = ideas
    .filter((i) => i.status === 'conhecimento_org')
    .slice(0, 9)
    .map((i) => ({
      id: i.id, title: i.title, summary: i.summary,
      author_name: i.author?.name ?? 'Colaborador',
      improvement_area: i.improvement_area,
      updated_at: i.updated_at,
      ai_score: Number(i.ai_score ?? 0),
      social_score: i.social_score ?? 0,
    }))

  // ── Monthly trend (last 6 months) ──
  const now = new Date()
  const monthlyTrend = Array.from({ length: 6 }, (_, idx) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
    const count = ideas.filter((i) => i.created_at.slice(0, 7) === key).length
    return { key, label, count }
  })

  // ── Top contributors ──
  const authorCount: Record<string, { ideaCount: number; approvedCount: number }> = {}
  for (const idea of ideas) {
    const entry = authorCount[idea.author_id] ?? { ideaCount: 0, approvedCount: 0 }
    entry.ideaCount++
    if (idea.status === 'em_implantacao' || idea.status === 'conhecimento_org') entry.approvedCount++
    authorCount[idea.author_id] = entry
  }

  const topAuthorIds = Object.entries(authorCount)
    .sort((a, b) => b[1].ideaCount - a[1].ideaCount)
    .slice(0, 5)
    .map(([id]) => id)

  let topContributors: ManagerMetricsData['topContributors'] = []
  if (topAuthorIds.length > 0) {
    const { data: usersData } = await supabase
      .from('users')
      .select('id, name, points')
      .in('id', topAuthorIds)
    const usersMap = ((usersData ?? []) as TopContributorRaw[]).reduce<Record<string, TopContributorRaw>>((acc, u) => {
      acc[u.id] = u; return acc
    }, {})
    topContributors = topAuthorIds.map((id) => ({
      id,
      name: usersMap[id]?.name ?? 'Colaborador',
      points: usersMap[id]?.points ?? 0,
      ideaCount: authorCount[id].ideaCount,
      approvedCount: authorCount[id].approvedCount,
    }))
  }

  // ── KPIs ──
  const actionableCount = ideas.filter((i) => i.status === 'em_analise' || i.status === 'em_implantacao' || i.status === 'conhecimento_org').length
  const successCount = ideas.filter((i) => i.status === 'em_implantacao' || i.status === 'conhecimento_org').length
  const conversionRate = actionableCount > 0 ? Math.round((successCount / actionableCount) * 100) : 0

  return {
    statusCounts,
    areaCounts,
    successCases,
    monthlyTrend,
    conversionRate,
    totalIdeas: ideas.length,
    awaitingAnalysis: ideas.filter((i) => i.status === 'em_analise').length,
    gerouValor: ideas.filter((i) => i.status === 'conhecimento_org').length,
    topContributors,
  }
}

export async function fetchApprovedByManager(managerId: string): Promise<IdeaListItem[]> {
  const supabase = createClient()

  const { data: managerRow } = await supabase
    .from('users')
    .select('sector_id')
    .eq('id', managerId)
    .single()

  let query = supabase
    .from('ideas')
    .select(`
      *,
      author:users!ideas_author_id_fkey(id, name),
      sector:sectors!ideas_sector_id_fkey(id, name),
      idea_rejections(count),
      comments(*, author:users!comments_user_id_fkey(id, name), comment_likes(user_id))
    `)
    .eq('approved_by', managerId)

  if (managerRow?.sector_id) {
    query = query.eq('sector_id', managerRow.sector_id) as typeof query
  }

  const { data, error } = await query.order('updated_at', { ascending: false })

  if (error) throw error

  return ((data ?? []) as unknown as ApprovedIdeaQueryRow[]).map((row) => {
    const flat = (row.comments ?? []).map((c) => ({
      id: c.id,
      idea_id: c.idea_id,
      user_id: c.user_id,
      author_name: c.author?.name ?? 'Colaborador',
      content: c.content,
      created_at: c.created_at,
      parent_id: c.parent_id ?? null,
      like_count: c.comment_likes?.length ?? 0,
      replies: [] as IdeaComment[],
    }))
    const comments = buildApprovedCommentTree(flat)
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
      rejected_by: null,
      rejection_reason: row.rejection_reason,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }
  })
}
