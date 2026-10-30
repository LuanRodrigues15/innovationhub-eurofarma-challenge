import { createClient } from '@/lib/supabase/client'
import { createNotification } from '@/services/notificationService'
import type { Database } from '@/types/database.types'

type UserRow = Database['public']['Tables']['users']['Row']
type SectorRow = Database['public']['Tables']['sectors']['Row']
type MentorProfileRow = Database['public']['Tables']['mentor_profiles']['Row']
type MentorshipRequestRow = Database['public']['Tables']['mentorship_requests']['Row']
type MentorshipEvaluationRow = Database['public']['Tables']['mentorship_evaluations']['Row']

export type MentorProfile = MentorProfileRow & {
  user_name: string
  sector_name: string | null
}

export type MentorshipEvaluation = MentorshipEvaluationRow

export type MentorshipRequest = MentorshipRequestRow & {
  mentor_name: string
  mentee_name: string
  mentor_knowledge_area: string | null
  mentor_sector_name: string | null
  evaluations: MentorshipEvaluation[]
}

export type MyMentorshipsData = {
  active: MentorshipRequest[]
  pending: MentorshipRequest[]
  history: MentorshipRequest[]
  candidateProfile: MentorProfile | null
}

type MentorProfileQueryRow = MentorProfileRow & {
  user: Pick<UserRow, 'name'> | null
  sector: Pick<SectorRow, 'name'> | null
}

type MentorshipRequestQueryRow = MentorshipRequestRow & {
  mentor: Pick<UserRow, 'name'> | null
  mentee: Pick<UserRow, 'name'> | null
}

type MentorshipNotificationQueryRow = Pick<
  MentorshipRequestRow,
  'id' | 'mentor_id' | 'mentee_id' | 'next_meeting_date' | 'next_meeting_proposed_by'
> & {
  mentor: Pick<UserRow, 'name'> | null
  mentee: Pick<UserRow, 'name'> | null
}

type MentorAreaQueryRow = Pick<MentorProfileRow, 'user_id' | 'knowledge_area'> & {
  sector: Pick<SectorRow, 'name'> | null
}

type MentorRequestMeta = {
  knowledge_area: string | null
  sector_name: string | null
}

async function notify(input: {
  userId: string
  type: string
  title: string
  body: string
  referenceId?: string | null
}) {
  await createNotification({
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    href: '/mentorships?view=mentee',
    referenceId: input.referenceId ?? null,
  }).catch(() => null)
}

async function fetchRequestNotificationContext(requestId: string): Promise<MentorshipNotificationQueryRow> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('mentorship_requests')
    .select(
      `
      id,
      mentor_id,
      mentee_id,
      next_meeting_date,
      next_meeting_proposed_by,
      mentor:users!mentorship_requests_mentor_id_fkey(name),
      mentee:users!mentorship_requests_mentee_id_fkey(name)
    `
    )
    .eq('id', requestId)
    .single()

  if (error) throw error
  return data as unknown as MentorshipNotificationQueryRow
}

function parseNumber(value: string | null | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function calculateLevel(points: number): number {
  if (points > 10000) return 5
  if (points >= 5001) return 4
  if (points >= 1501) return 3
  if (points >= 501) return 2
  return 1
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

function mapMentor(row: MentorProfileQueryRow): MentorProfile {
  return {
    id: row.id,
    user_id: row.user_id,
    knowledge_area: row.knowledge_area,
    sector_id: row.sector_id,
    status: row.status,
    validated_by: row.validated_by,
    created_at: row.created_at,
    user_name: row.user?.name ?? 'Mentor',
    sector_name: row.sector?.name ?? null,
  }
}

function mapRequest(
  row: MentorshipRequestQueryRow,
  mentorMeta?: MentorRequestMeta,
  evaluations: MentorshipEvaluation[] = []
): MentorshipRequest {
  return {
    id: row.id,
    mentee_id: row.mentee_id,
    mentor_id: row.mentor_id,
    status: row.status,
    objective: row.objective,
    confirmed_by: row.confirmed_by,
    mentor_rating: row.mentor_rating,
    mentor_feedback: row.mentor_feedback,
    mentor_evaluated_at: row.mentor_evaluated_at,
    mentee_rating: row.mentee_rating,
    mentee_feedback: row.mentee_feedback,
    mentee_evaluated_at: row.mentee_evaluated_at,
    next_meeting_date: row.next_meeting_date,
    next_meeting_status: row.next_meeting_status,
    next_meeting_proposed_by: row.next_meeting_proposed_by,
    next_meeting_responded_by: row.next_meeting_responded_by,
    next_meeting_responded_at: row.next_meeting_responded_at,
    created_at: row.created_at,
    mentor_name: row.mentor?.name ?? 'Mentor',
    mentee_name: row.mentee?.name ?? 'Mentorado',
    mentor_knowledge_area: mentorMeta?.knowledge_area ?? null,
    mentor_sector_name: mentorMeta?.sector_name ?? null,
    evaluations,
  }
}

async function fetchMentorRequestMeta(mentorIds: string[]): Promise<Record<string, MentorRequestMeta>> {
  const uniqueIds = Array.from(new Set(mentorIds)).filter(Boolean)
  if (uniqueIds.length === 0) return {}

  const supabase = createClient()
  const { data, error } = await supabase
    .from('mentor_profiles')
    .select('user_id, knowledge_area, sector:sectors!mentor_profiles_sector_id_fkey(name)')
    .in('user_id', uniqueIds)

  if (error) throw error

  return ((data ?? []) as unknown as MentorAreaQueryRow[]).reduce<Record<string, MentorRequestMeta>>(
    (acc, profile) => {
      acc[profile.user_id] = {
        knowledge_area: profile.knowledge_area,
        sector_name: profile.sector?.name ?? null,
      }
      return acc
    },
    {}
  )
}

async function fetchMentorshipEvaluations(
  requestIds: string[]
): Promise<Record<string, MentorshipEvaluation[]>> {
  const uniqueIds = Array.from(new Set(requestIds)).filter(Boolean)
  if (uniqueIds.length === 0) return {}

  const supabase = createClient()
  const { data, error } = await supabase
    .from('mentorship_evaluations')
    .select('*')
    .in('request_id', uniqueIds)
    .order('created_at', { ascending: false })

  if (error) throw error

  return ((data ?? []) as MentorshipEvaluation[]).reduce<Record<string, MentorshipEvaluation[]>>(
    (acc, evaluation) => {
      acc[evaluation.request_id] = [...(acc[evaluation.request_id] ?? []), evaluation]
      return acc
    },
    {}
  )
}

export async function fetchActiveMentors(area?: string): Promise<MentorProfile[]> {
  const supabase = createClient()
  let query = supabase
    .from('mentor_profiles')
    .select(
      `
      *,
      user:users!mentor_profiles_user_id_fkey(name),
      sector:sectors!mentor_profiles_sector_id_fkey(name)
    `
    )
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (area && area !== 'all') {
    query = query.ilike('knowledge_area', `%${area}%`)
  }

  const { data, error } = await query

  if (error) throw error
  return ((data ?? []) as unknown as MentorProfileQueryRow[]).map(mapMentor)
}

export async function fetchMentorAreas(): Promise<string[]> {
  const mentors = await fetchActiveMentors()
  return Array.from(new Set(mentors.map((mentor) => mentor.knowledge_area))).sort()
}

export async function requestMentorship(
  menteeId: string,
  mentorId: string,
  objective: string
): Promise<{ id: string }> {
  if (menteeId === mentorId) {
    throw new Error('Você não pode solicitar mentoria para si mesmo.')
  }

  const normalizedObjective = objective.trim()
  if (normalizedObjective.length < 10) {
    throw new Error('Descreva brevemente o objetivo da mentoria.')
  }

  const supabase = createClient()

  const { data: existing, error: existingError } = await supabase
    .from('mentorship_requests')
    .select('id')
    .eq('mentee_id', menteeId)
    .eq('mentor_id', mentorId)
    .in('status', ['pending', 'active'])
    .maybeSingle()

  if (existingError) throw existingError
  if (existing) throw new Error('Você já possui solicitação ativa com este mentor.')

  const { data, error } = await supabase
    .from('mentorship_requests')
    .insert({
      mentee_id: menteeId,
      mentor_id: mentorId,
      status: 'pending',
      objective: normalizedObjective,
    })
    .select('id')
    .single()

  if (error) throw error
  await notify({
    userId: mentorId,
    type: 'mentorship_request',
    title: 'Nova solicitação de mentoria',
    body: `Você recebeu uma proposta de mentoria: ${normalizedObjective}`,
    referenceId: data.id,
  })
  return { id: data.id }
}

export async function applyAsMentor(
  userId: string,
  sectorId: string | null,
  knowledgeArea: string
): Promise<void> {
  const normalized = knowledgeArea.trim()
  if (!normalized) throw new Error('Informe a área de conhecimento.')

  const supabase = createClient()
  const { data: existing, error: existingError } = await supabase
    .from('mentor_profiles')
    .select('id, status')
    .eq('user_id', userId)
    .maybeSingle()

  if (existingError) throw existingError
  if (existing) {
    throw new Error('Você já possui uma candidatura ou perfil de mentor.')
  }

  const { error } = await supabase.from('mentor_profiles').insert({
    user_id: userId,
    sector_id: sectorId,
    knowledge_area: normalized,
    status: 'pending',
  })

  if (error) throw error
}

export async function deactivateOwnMentorProfile(userId: string): Promise<void> {
  const supabase = createClient()
  const [profileResult, userResult] = await Promise.all([
    supabase
      .from('mentor_profiles')
      .delete()
      .eq('user_id', userId)
      .eq('status', 'active'),
    supabase
      .from('users')
      .update({ is_mentor: false })
      .eq('id', userId),
  ])

  if (profileResult.error) throw profileResult.error
  if (userResult.error) throw userResult.error
}

export async function updateMentorProfile(
  userId: string,
  sectorId: string | null,
  knowledgeArea: string
): Promise<void> {
  const normalized = knowledgeArea.trim()
  if (!normalized) throw new Error('Informe a área de conhecimento.')

  const supabase = createClient()
  const { error } = await supabase
    .from('mentor_profiles')
    .update({
      sector_id: sectorId,
      knowledge_area: normalized,
    })
    .eq('user_id', userId)

  if (error) throw error
}

export async function fetchMyMentorships(userId: string): Promise<MyMentorshipsData> {
  const supabase = createClient()

  const [requestsResult, profileResult] = await Promise.all([
    supabase
      .from('mentorship_requests')
      .select(
        `
        *,
        mentor:users!mentorship_requests_mentor_id_fkey(name),
        mentee:users!mentorship_requests_mentee_id_fkey(name)
      `
      )
      .or(`mentee_id.eq.${userId},mentor_id.eq.${userId}`)
      .order('created_at', { ascending: false }),
    supabase
      .from('mentor_profiles')
      .select(
        `
        *,
        user:users!mentor_profiles_user_id_fkey(name),
        sector:sectors!mentor_profiles_sector_id_fkey(name)
      `
      )
      .eq('user_id', userId)
      .maybeSingle(),
  ])

  if (requestsResult.error) throw requestsResult.error
  if (profileResult.error) throw profileResult.error

  const requestRows = (requestsResult.data ?? []) as unknown as MentorshipRequestQueryRow[]
  const [mentorMeta, evaluationsByRequest] = await Promise.all([
    fetchMentorRequestMeta(requestRows.map((request) => request.mentor_id)),
    fetchMentorshipEvaluations(requestRows.map((request) => request.id)),
  ])
  const requests = requestRows.map((request) =>
    mapRequest(request, mentorMeta[request.mentor_id], evaluationsByRequest[request.id] ?? [])
  )

  return {
    active: requests.filter((request) => request.status === 'active'),
    pending: requests.filter((request) => request.status === 'pending'),
    history: requests.filter((request) => request.status === 'completed' || request.status === 'cancelled'),
    candidateProfile: profileResult.data
      ? mapMentor(profileResult.data as unknown as MentorProfileQueryRow)
      : null,
  }
}

export async function fetchMyCandidateProfile(userId: string): Promise<MentorProfile | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('mentor_profiles')
    .select('*, user:users!mentor_profiles_user_id_fkey(name), sector:sectors!mentor_profiles_sector_id_fkey(name)')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data ? mapMentor(data as unknown as MentorProfileQueryRow) : null
}

export async function cancelMentorshipRequest(requestId: string, userId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('mentorship_requests')
    .update({ status: 'cancelled' })
    .eq('id', requestId)
    .eq('mentee_id', userId)
    .eq('status', 'pending')

  if (error) throw error
}

export async function approveMentorshipRequest(requestId: string, mentorId: string): Promise<void> {
  const supabase = createClient()
  const request = await fetchRequestNotificationContext(requestId)
  const { error } = await supabase
    .from('mentorship_requests')
    .update({
      status: 'active',
      confirmed_by: mentorId,
    })
    .eq('id', requestId)
    .eq('mentor_id', mentorId)
    .eq('status', 'pending')

  if (error) throw error
  await notify({
    userId: request.mentee_id,
    type: 'mentorship_request_approved',
    title: 'Mentoria aprovada',
    body: `${request.mentor?.name ?? 'O mentor'} aceitou sua solicitação de mentoria.`,
    referenceId: requestId,
  })
}

export async function rejectMentorshipRequest(requestId: string, mentorId: string): Promise<void> {
  const supabase = createClient()
  const request = await fetchRequestNotificationContext(requestId)
  const { error } = await supabase
    .from('mentorship_requests')
    .update({ status: 'cancelled' })
    .eq('id', requestId)
    .eq('mentor_id', mentorId)
    .eq('status', 'pending')

  if (error) throw error
  await notify({
    userId: request.mentee_id,
    type: 'mentorship_request_rejected',
    title: 'Solicitação de mentoria recusada',
    body: `${request.mentor?.name ?? 'O mentor'} recusou a solicitação de mentoria.`,
    referenceId: requestId,
  })
}

export async function proposeNextMeetingDate(
  requestId: string,
  userId: string,
  meetingDate: string
): Promise<void> {
  const normalizedDate = meetingDate.trim()
  if (!normalizedDate) throw new Error('Selecione a data da próxima reunião.')

  const supabase = createClient()
  const request = await fetchRequestNotificationContext(requestId)
  const { error } = await supabase
    .from('mentorship_requests')
    .update({
      next_meeting_date: normalizedDate,
      next_meeting_status: 'proposed',
      next_meeting_proposed_by: userId,
      next_meeting_responded_by: null,
      next_meeting_responded_at: null,
    })
    .eq('id', requestId)
    .eq('status', 'active')
    .or(`mentee_id.eq.${userId},mentor_id.eq.${userId}`)

  if (error) throw error
  const recipientId = request.mentor_id === userId ? request.mentee_id : request.mentor_id
  const proposerName = request.mentor_id === userId
    ? request.mentor?.name ?? 'Seu mentor'
    : request.mentee?.name ?? 'Seu mentorado'

  await notify({
    userId: recipientId,
    type: 'mentorship_meeting_proposed',
    title: 'Nova proposta de data',
    body: `${proposerName} propôs uma data para a próxima reunião.`,
    referenceId: requestId,
  })
}

export async function approveNextMeetingDate(requestId: string, userId: string): Promise<void> {
  const supabase = createClient()
  const request = await fetchRequestNotificationContext(requestId)
  const { error } = await supabase
    .from('mentorship_requests')
    .update({
      next_meeting_status: 'approved',
      next_meeting_responded_by: userId,
      next_meeting_responded_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .eq('status', 'active')
    .eq('next_meeting_status', 'proposed')
    .neq('next_meeting_proposed_by', userId)
    .or(`mentee_id.eq.${userId},mentor_id.eq.${userId}`)

  if (error) throw error
  const proposerId = request.next_meeting_proposed_by
  if (proposerId) {
    const approverName = request.mentor_id === userId
      ? request.mentor?.name ?? 'Seu mentor'
      : request.mentee?.name ?? 'Seu mentorado'
    await notify({
      userId: proposerId,
      type: 'mentorship_meeting_approved',
      title: 'Data aprovada',
      body: `${approverName} aprovou a data proposta para a próxima reunião.`,
      referenceId: requestId,
    })
  }
}

export async function declineNextMeetingDate(requestId: string, userId: string): Promise<void> {
  const supabase = createClient()
  const request = await fetchRequestNotificationContext(requestId)
  const { error } = await supabase
    .from('mentorship_requests')
    .update({
      next_meeting_status: 'declined',
      next_meeting_responded_by: userId,
      next_meeting_responded_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .eq('status', 'active')
    .eq('next_meeting_status', 'proposed')
    .neq('next_meeting_proposed_by', userId)
    .or(`mentee_id.eq.${userId},mentor_id.eq.${userId}`)

  if (error) throw error
  const proposerId = request.next_meeting_proposed_by
  if (proposerId) {
    const respondentName = request.mentor_id === userId
      ? request.mentor?.name ?? 'Seu mentor'
      : request.mentee?.name ?? 'Seu mentorado'
    await notify({
      userId: proposerId,
      type: 'mentorship_meeting_declined',
      title: 'Data recusada',
      body: `${respondentName} recusou a data proposta. Sugira uma nova opção.`,
      referenceId: requestId,
    })
  }
}

export async function completeMentorshipRequest(requestId: string, userId: string): Promise<void> {
  const supabase = createClient()
  const { data: request, error: requestError } = await supabase
    .from('mentorship_requests')
    .select(
      `
      mentor_id,
      mentee_id,
      mentor:users!mentorship_requests_mentor_id_fkey(name),
      mentee:users!mentorship_requests_mentee_id_fkey(name)
    `
    )
    .eq('id', requestId)
    .eq('status', 'active')
    .or(`mentee_id.eq.${userId},mentor_id.eq.${userId}`)
    .single()

  if (requestError) throw requestError

  const { error } = await supabase
    .from('mentorship_requests')
    .update({ status: 'completed' })
    .eq('id', requestId)
    .eq('status', 'active')
    .or(`mentee_id.eq.${userId},mentor_id.eq.${userId}`)

  if (error) throw error

  const [givePoints, receivePoints] = await Promise.all([
    getSettingNumber('points_give_mentorship', 30),
    getSettingNumber('points_receive_mentorship', 15),
  ])

  await Promise.all([
    creditUserPoints(request.mentor_id, givePoints, 'give_mentorship', requestId),
    creditUserPoints(request.mentee_id, receivePoints, 'receive_mentorship', requestId),
  ])

  const completedByMentor = request.mentor_id === userId
  const recipientId = completedByMentor ? request.mentee_id : request.mentor_id
  const actorName = completedByMentor
    ? request.mentor?.name ?? 'Seu mentor'
    : request.mentee?.name ?? 'Seu mentorado'

  await notify({
    userId: recipientId,
    type: 'mentorship_completed',
    title: 'Mentoria concluída',
    body: `${actorName} marcou a mentoria como concluída. Você já pode registrar sua avaliação.`,
    referenceId: requestId,
  })
}

export async function submitMentorshipEvaluation(
  requestId: string,
  userId: string,
  rating: number,
  feedback: string
): Promise<void> {
  const normalizedRating = Math.round(rating)

  if (normalizedRating < 1 || normalizedRating > 5) {
    throw new Error('Escolha uma nota de 1 a 5.')
  }

  const supabase = createClient()
  const { data: request, error: requestError } = await supabase
    .from('mentorship_requests')
    .select(
      `
      mentor_id,
      mentee_id,
      status,
      mentor:users!mentorship_requests_mentor_id_fkey(name),
      mentee:users!mentorship_requests_mentee_id_fkey(name)
    `
    )
    .eq('id', requestId)
    .eq('status', 'completed')
    .or(`mentee_id.eq.${userId},mentor_id.eq.${userId}`)
    .single()

  if (requestError) throw requestError

  const normalizedFeedback = feedback.trim()
  const isMentor = request.mentor_id === userId
  const role = isMentor ? 'mentor' : 'mentee'

  const { error } = await supabase
    .from('mentorship_evaluations')
    .insert({
      request_id: requestId,
      evaluator_id: userId,
      role,
      rating: normalizedRating,
      feedback: normalizedFeedback || null,
    })

  if (error) throw error

  const recipientId = isMentor ? request.mentee_id : request.mentor_id
  const evaluatorName = isMentor
    ? request.mentor?.name ?? 'Seu mentor'
    : request.mentee?.name ?? 'Seu mentorado'

  await notify({
    userId: recipientId,
    type: 'mentorship_evaluation_created',
    title: 'Nova avaliação de mentoria',
    body: `${evaluatorName} registrou uma nova avaliação na mentoria concluída.`,
    referenceId: requestId,
  })
}

export async function cancelMentorApplication(userId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('mentor_profiles')
    .delete()
    .eq('user_id', userId)
    .eq('status', 'pending')

  if (error) throw error
}
