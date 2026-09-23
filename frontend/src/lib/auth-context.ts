import { createContext, useContext } from 'react'

export type UserRole = 'USER' | 'ADMIN' | 'RESPONDER'

export interface AuthUser {
  id: string
  name: string
  email: string
  phone: string
  role: UserRole
  language?: string
  isActive?: boolean
  createdAt: string
  updatedAt: string
}

export interface RegisterData {
  name: string
  email: string
  phone: string
  password: string
  language?: string
}

export interface ProfilePatch {
  name?: string
  email?: string
  phone?: string
  language?: string
}

export interface AuthResult {
  user: AuthUser
  token: string
}

export interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  initializing: boolean
  busy: boolean
  error: string | null
  login: (identifier: string, password: string, remember?: boolean) => Promise<AuthUser>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
  updateProfile: (patch: ProfilePatch) => Promise<void>
  clearError: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
