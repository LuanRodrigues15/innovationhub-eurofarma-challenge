/**
 * services/auth.service.ts
 *
 * Encapsula toda a lógica de acesso ao Supabase relacionada a autenticação
 * e busca do perfil do usuário atual.
 *
 * Regra: componentes de UI NÃO devem importar createClient() diretamente.
 * Use os hooks (useUser, useViewAs) ou este service.
 */

import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

type UserRow = Database['public']['Tables']['users']['Row']

export type UserProfile = Pick<
  UserRow,
  | 'id'
  | 'name'
  | 'email'
  | 'role'
  | 'sector_id'
  | 'points'
  | 'level'
  | 'is_visible_in_ranking'
  | 'is_mentor'
  | 'can_visualize_as'
> & { sector_name: string | null }

const USER_SELECT_FIELDS =
  'id, name, email, role, sector_id, sectors(name), points, level, is_visible_in_ranking, is_mentor, can_visualize_as'

function normalizeProfile(raw: Record<string, unknown>): UserProfile {
  const { sectors, ...rest } = raw
  return {
    ...(rest as Omit<UserProfile, 'sector_name'>),
    sector_name: (sectors as { name: string } | null)?.name ?? null,
  }
}

/**
 * Busca o perfil de um usuário Totem pelo ID armazenado em sessionStorage.
 * Retorna null se o usuário não for encontrado.
 */
export async function getTotemUserProfile(
  userId: string
): Promise<{ data: UserProfile | null; error: string | null }> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('users')
    .select(USER_SELECT_FIELDS)
    .eq('id', userId)
    .single()

  if (error) {
    return { data: null, error: 'Erro ao buscar dados do usuário Totem.' }
  }

  return { data: normalizeProfile(data as Record<string, unknown>), error: null }
}

/**
 * Busca o perfil do usuário desktop autenticado via Supabase Auth.
 * Retorna null se não houver sessão ativa ou usuário não encontrado no banco.
 */
export async function getAuthenticatedUserProfile(): Promise<{
  data: UserProfile | null
  error: string | null
}> {
  const supabase = createClient()

  const {
    data: { session },
    error: authError,
  } = await supabase.auth.getSession()

  const authUser = session?.user ?? null

  if (authError || !authUser) {
    return { data: null, error: 'Nenhuma sessão ativa.' }
  }

  const { data, error } = await supabase
    .from('users')
    .select(USER_SELECT_FIELDS)
    .eq('id', authUser.id)
    .single()

  if (error) {
    return { data: null, error: 'Erro ao buscar dados do usuário.' }
  }

  return { data: normalizeProfile(data as Record<string, unknown>), error: null }
}

/**
 * Encerra a sessão do usuário desktop (Supabase Auth) e limpa
 * os dados de Totem e ViewAs do sessionStorage.
 */
export async function signOut(): Promise<void> {
  const supabase = createClient()
  await supabase.auth.signOut()

  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('totem_user_id')
    sessionStorage.removeItem('viewing_as')
  }
}
