import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

type ModerationAlert = Database['public']['Tables']['moderation_alerts']['Row']

export async function registerAlert(
  userId: string,
  content: string,
  occurrence: number
): Promise<ModerationAlert> {
  const supabase = createClient()

  if (occurrence === 1) {
    const { data, error } = await supabase
      .from('moderation_alerts')
      .insert({
        user_id: userId,
        content,
        status: 'pending',
        occurrence_count: 1,
      })
      .select()
      .single()

    if (error) throw error
    return data as ModerationAlert
  }

  const { data: existing, error: fetchError } = await supabase
    .from('moderation_alerts')
    .select('id, occurrence_count')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (fetchError) throw fetchError

  if (existing) {
    const { data, error } = await supabase
      .from('moderation_alerts')
      .update({
        occurrence_count: existing.occurrence_count + 1,
        status: 'warned',
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) throw error
    return data as ModerationAlert
  }

  const { data, error } = await supabase
    .from('moderation_alerts')
    .insert({
      user_id: userId,
      content,
      status: 'warned',
      occurrence_count: 2,
    })
    .select()
    .single()

  if (error) throw error
  return data as ModerationAlert
}
