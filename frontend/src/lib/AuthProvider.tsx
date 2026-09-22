import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ApiError, api, clearStoredToken, getStoredToken, onUnauthorized, setStoredToken } from './api'
import {
  AuthContext,
  type AuthContextValue,
  type AuthResult,
  type AuthUser,
  type ProfilePatch,
  type RegisterData,
} from './auth-context'

function friendlyMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message
  return 'Something went wrong. Please try again.'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(() => getStoredToken())
  const [initializing, setInitializing] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const stored = getStoredToken()
    if (!stored) {
      setUser(null)
      setToken(null)
      return
    }
    const data = await api<{ user: AuthUser }>('/auth/me', { token: stored })
    setUser(data.user)
    setToken(stored)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function initialise(): Promise<void> {
      try {
        await refresh()
      } catch {
        if (!cancelled) {
          clearStoredToken()
          setUser(null)
          setToken(null)
        }
      } finally {
        if (!cancelled) setInitializing(false)
      }
    }
    void initialise()
    return () => {
      cancelled = true
    }
  }, [refresh])

  // Expired/revoked tokens encountered by any authenticated request sign the
  // user out once; the Shell redirect effect then lands on /login.
  useEffect(() => {
    onUnauthorized(() => {
      clearStoredToken()
      setUser(null)
      setToken(null)
    })
    return () => {
      onUnauthorized(null)
    }
  }, [])

  const login = useCallback(async (identifier: string, password: string) => {
    setBusy(true)
    setError(null)
    try {
      const data = await api<AuthResult>('/auth/login', {
        method: 'POST',
        token: null,
        body: { identifier, password },
      })
      setStoredToken(data.token)
      setUser(data.user)
      setToken(data.token)
    } catch (err) {
      setError(friendlyMessage(err))
      throw err
    } finally {
      setBusy(false)
    }
  }, [])

  const register = useCallback(async (data: RegisterData) => {
    setBusy(true)
    setError(null)
    try {
      const result = await api<AuthResult>('/auth/register', {
        method: 'POST',
        token: null,
        body: data,
      })
      setStoredToken(result.token)
      setUser(result.user)
      setToken(result.token)
    } catch (err) {
      setError(friendlyMessage(err))
      throw err
    } finally {
      setBusy(false)
    }
  }, [])

  const logout = useCallback(async () => {
    setBusy(true)
    try {
      await api<{ message: string }>('/auth/logout', { method: 'POST', token: null })
    } catch {
      /* logout completes client-side even if the server is unreachable */
    } finally {
      clearStoredToken()
      setUser(null)
      setToken(null)
      setBusy(false)
    }
  }, [])

  const updateProfile = useCallback(async (patch: ProfilePatch) => {
    setBusy(true)
    setError(null)
    try {
      const data = await api<{ user: AuthUser }>('/auth/profile', {
        method: 'PATCH',
        body: patch,
      })
      setUser(data.user)
    } catch (err) {
      setError(friendlyMessage(err))
      throw err
    } finally {
      setBusy(false)
    }
  }, [])

  const clearError = useCallback(() => setError(null), [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, initializing, busy, error, login, register, logout, refresh, updateProfile, clearError }),
    [user, token, initializing, busy, error, login, register, logout, refresh, updateProfile, clearError],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
