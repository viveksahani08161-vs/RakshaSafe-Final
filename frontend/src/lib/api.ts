const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'
const TOKEN_KEY = 'rakshasafe.token'

export class ApiError extends Error {
  status: number
  details?: unknown

  constructor(status: number, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

export function getStoredToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY) ?? window.sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setStoredToken(token: string, persistent = true): void {
  try {
    if (persistent) {
      window.localStorage.setItem(TOKEN_KEY, token)
      window.sessionStorage.removeItem(TOKEN_KEY)
    } else {
      window.sessionStorage.setItem(TOKEN_KEY, token)
      window.localStorage.removeItem(TOKEN_KEY)
    }
  } catch {
    /* storage unavailable — session lasts for this tab only */
  }
}

export function clearStoredToken(): void {
  try {
    window.localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignore */
  }
  try {
    window.sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

interface ApiOptions {
  method?: string
  body?: unknown
  token?: string | null
  signal?: AbortSignal
}

interface ApiEnvelope<T> {
  success: boolean
  data?: T
  error?: string
  details?: unknown
}

type UnauthorizedHandler = () => void

let unauthorizedHandler: UnauthorizedHandler | null = null

/**
 * Register a callback invoked when an authenticated request receives 401
 * (expired/revoked token). AuthProvider wires this to sign the user out so a
 * stale session can never linger. Requests sent without a token (login,
 * register, logout) never trigger it.
 */
export function onUnauthorized(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler
}

/** Typed fetch wrapper for the RakshaSafe REST API. Throws ApiError on failure. */
export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const token = options.token === undefined ? getStoredToken() : options.token
  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
      ...(options.signal ? { signal: options.signal } : {}),
    })
  } catch (err) {
    // Re-throw cancellations untouched so every caller's AbortError guard
    // works; otherwise a stale aborted request would surface as a failure
    // and mask successfully loaded data with an error panel.
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new ApiError(0, 'Cannot reach the server. Check your connection and try again.')
  }

  let envelope: ApiEnvelope<T>
  try {
    envelope = (await res.json()) as ApiEnvelope<T>
  } catch {
    throw new ApiError(res.status, 'Unexpected server response.')
  }

  if (!res.ok || envelope.success !== true || envelope.data === undefined) {
    if (res.status === 401 && token) unauthorizedHandler?.()
    throw new ApiError(
      res.status,
      envelope.error ?? `Request failed (${res.status}).`,
      envelope.details,
    )
  }
  return envelope.data
}
