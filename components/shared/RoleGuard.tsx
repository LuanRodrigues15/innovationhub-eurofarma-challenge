'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PERSONAS, currentPersona, type PersonaId } from '@/lib/mock/session'

// No lugar dos layouts de servidor (que liam o cookie do Supabase): a proteção de rota por perfil
// roda no navegador, lendo a sessão simulada. Perfil errado vai para a rota inicial do perfil certo.
export default function RoleGuard({
  allow,
  children,
}: {
  allow: PersonaId[]
  children: React.ReactNode
}) {
  const router = useRouter()
  const [ok, setOk] = useState(false)

  useEffect(() => {
    const persona = currentPersona()
    if (!persona || persona === 'totem') {
      router.replace('/login')
    } else if (!allow.includes(persona)) {
      router.replace(PERSONAS[persona].home)
    } else {
      setOk(true)
    }
  }, [allow, router])

  return ok ? <>{children}</> : null
}
