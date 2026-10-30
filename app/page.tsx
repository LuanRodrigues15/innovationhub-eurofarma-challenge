'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// A exportação estática não tem redirect de servidor: a raiz leva ao login pelo navegador.
export default function Home() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/login')
  }, [router])
  return null
}
