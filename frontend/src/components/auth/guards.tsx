import type { ReactNode } from 'react'
import { useAuth } from '../../lib/auth-context'

/** Render children only for authenticated users (Shell handles redirects). */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, initializing } = useAuth()
  if (initializing || !user) return null
  return <>{children}</>
}

/** Render children only for administrators (Shell handles redirects). */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, initializing } = useAuth()
  if (initializing || !user || user.role !== 'ADMIN') return null
  return <>{children}</>
}
