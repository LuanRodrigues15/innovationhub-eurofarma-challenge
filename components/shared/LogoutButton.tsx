'use client'

import { useRouter } from 'next/navigation'
import { signOut } from '@/services/auth.service'
import Icon from '@/components/shared/Icon'
import { clearUserCache } from '@/hooks/useUser'

export default function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    clearUserCache()
    await signOut()
    router.push('/login')
  }

  return (
    <button
      onClick={handleLogout}
      className="btn btn-danger btn-sm"
    >
      <Icon name="log-out" size={14} />
      Sair
    </button>
  )
}
