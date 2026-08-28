'use client'

import { useRouter } from 'next/navigation'
import { logout } from '@/lib/auth'

export default function LogoutButton() {
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.replace('/dashboard')
  }

  return (
    <button
      onClick={handleLogout}
      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
    >
      Logout
    </button>
  )
}