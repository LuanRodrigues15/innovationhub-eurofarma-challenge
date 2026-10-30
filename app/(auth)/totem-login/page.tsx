'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// O acesso ao Totem agora é um dos botões "Acessar como" do modal de login.
export default function TotemLoginPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/login')
  }, [router])
  return null
}
