import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

type MarketplaceItemRow = Database['public']['Tables']['marketplace_items']['Row']
type LedgerRow = Database['public']['Tables']['point_ledger']['Row']

export type MarketplaceItem = MarketplaceItemRow

export type MarketplaceSettings = Record<string, string>

export type TransactionLogItem = LedgerRow & {
  label: string
}

const ACTION_LABELS: Record<string, string> = {
  publish_idea: 'Ideia publicada',
  idea_to_analysis: 'Ideia entrou em análise',
  idea_approved: 'Ideia aprovada',
  idea_knowledge: 'Ideia chegou a Conhecimento Organizacional',
  complete_course: 'Curso concluído',
  complete_quiz: 'Quiz respondido corretamente',
  give_mentorship: 'Mentoria conduzida',
  receive_mentorship: 'Mentoria concluída como mentorado',
  validate_idea: 'Ideia validada',
  redeem_item: 'Benefício resgatado',
}

function calculateLevel(points: number): number {
  if (points > 10000) return 5
  if (points >= 5001) return 4
  if (points >= 1501) return 3
  if (points >= 501) return 2
  return 1
}

export function getActionLabel(actionType: string): string {
  return ACTION_LABELS[actionType] ?? actionType
}

export async function fetchItems(): Promise<MarketplaceItem[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('marketplace_items')
    .select('*')
    .eq('is_available', true)
    .order('cost_points', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function fetchSettings(): Promise<MarketplaceSettings> {
  const supabase = createClient()
  const { data, error } = await supabase.from('platform_settings').select('key, value')

  if (error) throw error

  return (data ?? []).reduce<MarketplaceSettings>((acc, setting) => {
    acc[setting.key] = setting.value
    return acc
  }, {})
}

export async function fetchTransactionLog(userId: string): Promise<TransactionLogItem[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('point_ledger')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map((item) => ({
    ...item,
    label: getActionLabel(item.action_type),
  }))
}

export async function redeemItem(
  userId: string,
  itemId: string
): Promise<{ success: true; newPoints: number; newLevel: number }> {
  const supabase = createClient()

  const { data: item, error: itemError } = await supabase
    .from('marketplace_items')
    .select('id, cost_points, is_available')
    .eq('id', itemId)
    .single()

  if (itemError) throw itemError
  if (!item.is_available) throw new Error('Item indisponível.')

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('points, level')
    .eq('id', userId)
    .single()

  if (userError) throw userError

  if ((user.points ?? 0) < item.cost_points) {
    throw new Error('Saldo insuficiente')
  }

  const { error: transactionError } = await supabase.from('marketplace_transactions').insert({
    user_id: userId,
    item_id: itemId,
    points_spent: item.cost_points,
  })

  if (transactionError) throw transactionError

  const { error: ledgerError } = await supabase.from('point_ledger').insert({
    user_id: userId,
    points: -item.cost_points,
    action_type: 'redeem_item',
    reference_id: itemId,
  })

  if (ledgerError) throw ledgerError

  const newPoints = (user.points ?? 0) - item.cost_points

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

  return { success: true, newPoints, newLevel }
}
