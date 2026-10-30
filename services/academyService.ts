import { createClient } from '@/lib/supabase/client'
import type { Json, Database } from '@/types/database.types'

type CourseRow = Database['public']['Tables']['courses']['Row']
type QuizRow = Database['public']['Tables']['quizzes']['Row']
type SectorRow = Database['public']['Tables']['sectors']['Row']

export type Course = CourseRow & {
  sector_name: string | null
}

export type QuizQuestion = Omit<QuizRow, 'options'> & {
  options: string[]
}

export type CourseDetail = {
  course: Course
  quizzes: QuizQuestion[]
}

type CourseQueryRow = CourseRow & {
  sector: Pick<SectorRow, 'name'> | null
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

function mapCourse(row: CourseQueryRow): Course {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    content: row.content,
    thumbnail_url: row.thumbnail_url,
    sector_id: row.sector_id,
    created_at: row.created_at,
    sector_name: row.sector?.name ?? null,
  }
}

function mapQuiz(row: QuizRow): QuizQuestion {
  return {
    ...row,
    options: parseOptions(row.options),
  }
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
): Promise<{ newPoints: number; newLevel: number }> {
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
  const newLevel = calculateLevel(newPoints + totalSpent)

  const { error: updateError } = await supabase
    .from('users')
    .update({ points: newPoints, level: newLevel })
    .eq('id', userId)

  if (updateError) throw updateError

  return { newPoints, newLevel }
}

export async function fetchCourses(sectorId?: string | null): Promise<Course[]> {
  const supabase = createClient()
  let query = supabase
    .from('courses')
    .select('*, sector:sectors!courses_sector_id_fkey(name)')
    .order('created_at', { ascending: false })

  if (sectorId && sectorId !== 'all') {
    query = query.or(`sector_id.eq.${sectorId},sector_id.is.null`)
  }

  const { data, error } = await query

  if (error) throw error
  return ((data ?? []) as unknown as CourseQueryRow[]).map(mapCourse)
}

export async function fetchCourseById(courseId: string): Promise<CourseDetail | null> {
  const supabase = createClient()

  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('*, sector:sectors!courses_sector_id_fkey(name)')
    .eq('id', courseId)
    .maybeSingle()

  if (courseError) throw courseError
  if (!course) return null

  const { data: quizzes, error: quizError } = await supabase
    .from('quizzes')
    .select('*')
    .eq('course_id', courseId)
    .order('created_at', { ascending: true })

  if (quizError) throw quizError

  return {
    course: mapCourse(course as unknown as CourseQueryRow),
    quizzes: (quizzes ?? []).map(mapQuiz),
  }
}

export async function fetchCourseCompletion(
  userId: string,
  courseId: string
): Promise<boolean> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('quiz_completions')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .eq('passed', true)
    .maybeSingle()

  if (error) throw error
  return Boolean(data)
}

export async function fetchCompletedCourseIds(userId: string): Promise<string[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('quiz_completions')
    .select('course_id')
    .eq('user_id', userId)
    .eq('passed', true)

  if (error) throw error
  return (data ?? []).map((completion) => completion.course_id)
}

export async function submitQuiz(
  userId: string,
  courseId: string,
  answers: Record<string, number>
): Promise<{
  alreadyCompleted?: boolean
  passed?: boolean
  pointsEarned?: number
  correctAnswers?: Record<string, number>
}> {
  const supabase = createClient()

  const { data: existing, error: existingError } = await supabase
    .from('quiz_completions')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .maybeSingle()

  if (existingError) throw existingError
  if (existing) return { alreadyCompleted: true }

  const { data: quizzes, error: quizError } = await supabase
    .from('quizzes')
    .select('*')
    .eq('course_id', courseId)

  if (quizError) throw quizError

  const correctAnswers = (quizzes ?? []).reduce<Record<string, number>>((acc, quiz) => {
    acc[quiz.id] = quiz.correct_answer
    return acc
  }, {})

  const passed = (quizzes ?? []).every((quiz) => answers[quiz.id] === quiz.correct_answer)

  if (!passed) {
    return { passed: false, correctAnswers }
  }

  const { error: completionError } = await supabase.from('quiz_completions').insert({
    user_id: userId,
    course_id: courseId,
    passed: true,
  })

  if (completionError) throw completionError

  const pointsEarned = await getSettingNumber('points_complete_quiz', 20)
  await creditUserPoints(userId, pointsEarned, 'complete_quiz', courseId)

  const coursePoints = await getSettingNumber('points_complete_course', 15)
  await creditUserPoints(userId, coursePoints, 'complete_course', courseId)

  return { passed: true, pointsEarned, correctAnswers }
}
