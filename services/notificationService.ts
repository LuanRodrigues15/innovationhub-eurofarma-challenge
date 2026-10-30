import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

export type Notification = Database['public']['Tables']['notifications']['Row']

export type CreateNotificationInput = {
  userId: string
  type: string
  title: string
  body: string
  href?: string | null
  referenceId?: string | null
}

export async function createNotification(input: CreateNotificationInput): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('notifications').insert({
    user_id: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    href: input.href ?? null,
    reference_id: input.referenceId ?? null,
  })

  if (error) throw error
}

export async function fetchMyNotifications(userId: string): Promise<Notification[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(8)

  if (error) throw error
  return data ?? []
}

export async function markNotificationRead(notificationId: string, userId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', userId)
    .is('read_at', null)

  if (error) throw error
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null)

  if (error) throw error
}
