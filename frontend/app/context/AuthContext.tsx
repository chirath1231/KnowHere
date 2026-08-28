'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { getToken, getUser } from '@/lib/auth'
import { useRouter } from 'next/navigation'

const AuthContext = createContext<any>(null)

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const token = getToken()
    const user = getUser()

    if (!token || !user) {
      router.push('/login')
    }

    setLoading(false)
  }, [])

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        Loading...
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{}}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)