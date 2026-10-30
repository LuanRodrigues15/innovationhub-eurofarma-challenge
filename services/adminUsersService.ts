import { createClient } from '@/lib/supabase/client'
import { uuid } from '@/lib/mock/db'

// Na versão original, estas ações passavam por uma rota de servidor com a chave de serviço do
// Supabase (criar e remover contas do Auth). Na demonstração, tudo acontece no banco em memória.

type CreateUserPayload = {
  name: string
  email: string
  password: string
  role: string
  sector_id: string | null
}

export async function createAdminUserAccount(payload: CreateUserPayload): Promise<void> {
  const name = payload.name.trim()
  const email = payload.email.trim().toLowerCase()
  const password = payload.password.trim()

  if (!name || !email || !password || !payload.role) {
    throw new Error('Nome, e-mail, senha e perfil são obrigatórios.')
  }
  if (!['funcionario', 'gestor', 'admin'].includes(payload.role)) {
    throw new Error('Perfil inválido.')
  }

  const supabase = createClient()
  const { data: existing } = await supabase.from('users').select('id').eq('email', email).maybeSingle()
  if (existing) throw new Error('Já existe um usuário com este e-mail.')

  const { error } = await supabase
    .from('users')
    .insert({ id: uuid(), name, email, role: payload.role, sector_id: payload.sector_id || null })
  if (error) throw new Error(error.message)
}

export async function resetAdminUserPassword(userId: string, password: string): Promise<void> {
  if (!userId || password.trim().length < 6) {
    throw new Error('Informe uma senha com no mínimo 6 caracteres.')
  }
  // A demonstração não guarda senhas: não há o que gravar.
}

export async function deleteAdminUserAccount(userId: string): Promise<void> {
  if (!userId) throw new Error('Usuário não informado.')
  const supabase = createClient()
  const { error } = await supabase.from('users').delete().eq('id', userId)
  if (error) throw new Error(error.message)
}
