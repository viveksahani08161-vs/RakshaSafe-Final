import { ApiError } from './api'

/**
 * Classifies a list-load failure so admin pages can show a useful, safe
 * error instead of blaming the network for every problem:
 * - `unreachable`: the backend could not be reached at all (network/CORS/down)
 * - `unauthorized`: 401 — session expired/invalid (global handler signs out)
 * - `denied`: 403 — authenticated but lacking permission
 * - `failed`: any other server error; the server message is safe to display
 */
export type RequestFailureKind = 'unreachable' | 'unauthorized' | 'denied' | 'failed'

export function toRequestFailureKind(err: unknown): RequestFailureKind {
  if (err instanceof ApiError) {
    if (err.status === 0) return 'unreachable'
    if (err.status === 401) return 'unauthorized'
    if (err.status === 403) return 'denied'
    return 'failed'
  }
  return 'unreachable'
}
