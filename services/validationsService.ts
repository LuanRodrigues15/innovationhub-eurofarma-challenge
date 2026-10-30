import { createClient } from '@/lib/supabase/client'
import { validateIdea, unvalidateIdea } from '@/services/ideasService'

export { validateIdea as upsertValidation, unvalidateIdea as deleteValidation }

export async function toggleDownvote(
  ideaId: string,
  userId: string
): Promise<{ active: boolean }> {
  const supabase = createClient()

  const { error } = await supabase
    .from('idea_rejections')
    .insert({ idea_id: ideaId, user_id: userId })

  if (error?.code === '23505') {
    // unique_violation — já existe, então remove
    const { error: deleteError } = await supabase
      .from('idea_rejections')
      .delete()
      .eq('idea_id', ideaId)
      .eq('user_id', userId)

    if (deleteError) throw deleteError
    return { active: false }
  }

  if (error) throw error
  return { active: true }
}

export async function fetchUserRejectedIdeaIds(userId: string): Promise<string[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('idea_rejections')
    .select('idea_id')
    .eq('user_id', userId)

  if (error) throw error
  return (data ?? []).map((row) => row.idea_id)
}
