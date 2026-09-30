import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { authApi, isApiConfigured } from '../api/client'
import type { AuthResponseDto, AuthUserDto, Role } from '../types/api'

export type AuthUser = { id: number | null; name: string; role: Role; phone?: string; email?: string }
type RegisterPayload = { name: string; phone: string; email: string; address: string; password: string }

type AuthContextValue = {
  user: AuthUser | null
  isApiConfigured: boolean
  authError: string
  submitting: boolean
  login: (phone: string, password: string) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  loginAsPreview: (role: Role) => void
  logout: () => void
}

const STORAGE_TOKEN = 'fishshop_access_token'
const STORAGE_ROLE = 'fishshop_user_role'
const STORAGE_NAME = 'fishshop_user_name'
const STORAGE_ID = 'fishshop_user_id'

const AuthContext = createContext<AuthContextValue | null>(null)

function readStoredUser(): AuthUser | null {
  const token = localStorage.getItem(STORAGE_TOKEN)
  if (!token) return null
  const storedId = localStorage.getItem(STORAGE_ID)
  return {
    id: storedId ? Number(storedId) : null,
    name: localStorage.getItem(STORAGE_NAME) || 'Customer',
    role: (localStorage.getItem(STORAGE_ROLE) as Role) || 'CUSTOMER',
  }
}

function persistUser(user: AuthUser, token?: string) {
  if (token) localStorage.setItem(STORAGE_TOKEN, token)
  localStorage.setItem(STORAGE_ROLE, user.role)
  localStorage.setItem(STORAGE_NAME, user.name)
  if (user.id != null) localStorage.setItem(STORAGE_ID, String(user.id))
}

function clearStoredUser() {
  localStorage.removeItem(STORAGE_TOKEN)
  localStorage.removeItem(STORAGE_ROLE)
  localStorage.removeItem(STORAGE_NAME)
  localStorage.removeItem(STORAGE_ID)
}

function fromUserDto(dto: AuthUserDto): AuthUser {
  return { id: dto.user_id, name: dto.name, role: dto.role, phone: dto.phone, email: dto.email }
}

function fromAuthResponse(data: AuthResponseDto | undefined, fallbackName: string): AuthUser {
  if (data?.user) return fromUserDto(data.user)
  return { id: null, name: fallbackName, role: 'CUSTOMER' }
}

function getAccessToken(data: AuthResponseDto | undefined) {
  return data?.access_token ?? data?.accessToken ?? data?.token
}

const PREVIEW_NAMES: Record<Role, string> = { ADMIN: 'Arjun R.', DELIVERY: 'Vishnu K.', CUSTOMER: 'Anu Mathew' }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser())
  const [authError, setAuthError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const handleUnauthorized = () => {
      clearStoredUser()
      setUser(null)
    }
    window.addEventListener('fishshop:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('fishshop:unauthorized', handleUnauthorized)
  }, [])

  // Revalidate the cached user against the backend on load, in case the
  // token expired or the user's role changed since it was cached.
  useEffect(() => {
    if (!isApiConfigured || !localStorage.getItem(STORAGE_TOKEN)) return
    authApi.me().then((response) => {
      const nextUser = fromUserDto(response.data)
      persistUser(nextUser)
      setUser(nextUser)
    }).catch(() => {
      // A 401 is handled by the unauthorized event listener above; any
      // other failure just leaves the cached user in place.
    })
  }, [])

  const login = async (phone: string, password: string) => {
    setAuthError('')
    setSubmitting(true)
    try {
      const response = await authApi.login(phone, password)
      const nextUser = fromAuthResponse(response.data, 'Customer')
      persistUser(nextUser, getAccessToken(response.data))
      setUser(nextUser)
    } catch {
      setAuthError('We could not reach the ORDS service. Check the API URL or use a preview account below.')
      throw new Error('login_failed')
    } finally {
      setSubmitting(false)
    }
  }

  const register = async (payload: RegisterPayload) => {
    setAuthError('')
    setSubmitting(true)
    try {
      const response = await authApi.register(payload)
      const nextUser = fromAuthResponse(response.data, payload.name)
      persistUser(nextUser, getAccessToken(response.data))
      setUser(nextUser)
    } catch {
      setAuthError('We could not reach the ORDS service. Check the API URL or use a preview account below.')
      throw new Error('register_failed')
    } finally {
      setSubmitting(false)
    }
  }

  const loginAsPreview = (role: Role) => {
    const nextUser: AuthUser = { id: null, name: PREVIEW_NAMES[role], role }
    persistUser(nextUser, 'preview-token')
    setUser(nextUser)
  }

  const logout = () => {
    clearStoredUser()
    setUser(null)
  }

  const value = useMemo(
    () => ({ user, isApiConfigured, authError, submitting, login, register, loginAsPreview, logout }),
    [user, authError, submitting],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
