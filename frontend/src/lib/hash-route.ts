import { useEffect, useState } from 'react'

export type AppRoute =
  | '/login'
  | '/register'
  | '/dashboard'
  | '/sos'
  | '/profile'
  | '/contacts'
  | '/resources'
  | '/notifications'
  | '/report-unsafe'
  | '/incident-detail'
  | '/responder'
  | '/admin/users'
  | '/admin/user-detail'
  | '/admin/dashboard'
  | '/admin/incidents'
  | '/admin/incident-detail'
  | '/admin/facilities'
  | '/admin/teams'
  | '/admin/unsafe-reports'
  | '/admin/reports'

const PREFIX = '#'

function rawHash(): string {
  return window.location.hash.replace(/^#/, '') || '/login'
}

/** Current route parsed from the live location hash (fresher than React state). */
export function parseHash(): AppRoute {
  const raw = rawHash()
  if (raw === '/admin/incidents' || raw.startsWith('/admin/incidents/')) {
    return raw === '/admin/incidents' ? '/admin/incidents' : '/admin/incident-detail'
  }
  if (raw === '/admin/users' || raw.startsWith('/admin/users/')) {
    return raw === '/admin/users' ? '/admin/users' : '/admin/user-detail'
  }
  if (raw.startsWith('/incident/')) {
    return '/incident-detail'
  }
  const known: AppRoute[] = [
    '/login',
    '/register',
    '/dashboard',
    '/sos',
    '/profile',
    '/contacts',
    '/resources',
    '/notifications',
    '/report-unsafe',
    '/responder',
    '/admin/users',
    '/admin/user-detail',
    '/admin/dashboard',
    '/admin/incidents',
    '/admin/facilities',
    '/admin/teams',
    '/admin/unsafe-reports',
    '/admin/reports',
  ]
  return (known.includes(raw as AppRoute) ? raw : '/login') as AppRoute
}

/** Incident id segment of `#/admin/incidents/:id`, or null. */
export function hashIncidentId(): string | null {
  const raw = rawHash()
  const prefix = '/admin/incidents/'
  if (!raw.startsWith(prefix)) return null
  const id = raw.slice(prefix.length).split('/')[0] ?? ''
  return id === '' ? null : id
}

/** User id segment of `#/admin/users/:id`, or null. */
export function hashUserId(): string | null {
  const raw = rawHash()
  const prefix = '/admin/users/'
  if (!raw.startsWith(prefix)) return null
  const id = raw.slice(prefix.length).split('/')[0] ?? ''
  return id === '' ? null : id
}

const DETAIL_ROUTES: AppRoute[] = ['/admin/incident-detail', '/incident-detail', '/admin/user-detail']

export function navigateTo(route: AppRoute): void {
  if (parseHash() === route && !DETAIL_ROUTES.includes(route)) {
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  } else {
    window.location.hash = `${PREFIX}${route}`
  }
}

export function navigateToIncident(id: string): void {
  window.location.hash = `${PREFIX}/admin/incidents/${id}`
}

export function navigateToUserIncident(id: string): void {
  window.location.hash = `${PREFIX}/incident/${id}`
}

/** Incident id segment of `#/incident/:id`, or null. */
export function hashUserIncidentId(): string | null {
  const raw = rawHash()
  const prefix = '/incident/'
  if (!raw.startsWith(prefix)) return null
  const id = raw.slice(prefix.length).split('/')[0] ?? ''
  return id === '' ? null : id
}

/** Minimal hash router — no extra dependencies, works with static hosting. */
export function useHashRoute(): AppRoute {
  const [route, setRoute] = useState<AppRoute>(() => parseHash())

  useEffect(() => {
    const onChange = (): void => setRoute(parseHash())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return route
}

/** Raw hash string; changes on every same-document navigation, even when the
 * parsed route stays the same (e.g. one incident detail to another). */
export function useRawHash(): string {
  const [hash, setHash] = useState<string>(() => rawHash())

  useEffect(() => {
    const onChange = (): void => setHash(rawHash())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return hash
}

/** Re-renders on hash change and returns the current admin incident id segment, if any. */
export function useHashIncidentId(): string | null {
  useRawHash()
  return hashIncidentId()
}

/** Re-renders on hash change and returns the current user incident id segment, if any. */
export function useHashUserIncidentId(): string | null {
  useRawHash()
  return hashUserIncidentId()
}
