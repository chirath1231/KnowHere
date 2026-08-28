export type AuthUser = {
  id: string
  name: string
  email: string
  is_active: boolean
}

const TOKEN_KEY = 'token'
const USER_KEY = 'user'
const COOKIE_TOKEN_KEY = 'access_token'

export function saveAuth(token: string, user: AuthUser) {
  if (typeof window === 'undefined') return

  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))

  document.cookie = `${COOKIE_TOKEN_KEY}=${token}; path=/; max-age=86400; samesite=lax`
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function getUser(): AuthUser | null {
  if (typeof window === 'undefined') return null

  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function logout() {
  if (typeof window === 'undefined') return

  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)

  document.cookie = `${COOKIE_TOKEN_KEY}=; path=/; max-age=0; samesite=lax`
}