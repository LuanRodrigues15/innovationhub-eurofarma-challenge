import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { createMockClient } from '@/lib/mock/client'

// A demonstração não tem banco: este cliente tem a mesma API do supabase-js, mas lê e grava
// em memória (veja lib/mock). Os tipos do supabase-js continuam valendo para todo o app.
let client: SupabaseClient<Database> | null = null

export function createClient(): SupabaseClient<Database> {
  if (!client) client = createMockClient() as unknown as SupabaseClient<Database>
  return client
}
