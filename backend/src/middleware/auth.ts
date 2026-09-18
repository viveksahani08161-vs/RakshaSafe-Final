import type { NextFunction, Request, Response } from 'express'
import { UserRole } from '../models/User.js'
import { forbidden, unauthorized } from '../utils/errors.js'
import { verifyAuthToken } from '../utils/jwt.js'

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization
  if (!header) return null
  const [scheme, token] = header.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null
  return token
}

/** Require a valid JWT. Attaches `{ userId, role }` to `req.auth`. */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req)
  if (!token) {
    next(unauthorized('Authentication required. Provide a Bearer token.'))
    return
  }
  const payload = verifyAuthToken(token)
  if (!payload) {
    next(unauthorized('Invalid or expired token.'))
    return
  }
  req.auth = { userId: payload.sub, role: payload.role }
  next()
}

/** Require the authenticated user to have the ADMIN role. Use after requireAuth. */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.auth) {
    next(unauthorized('Authentication required.'))
    return
  }
  if (req.auth.role !== UserRole.ADMIN) {
    next(forbidden('Administrator access required.'))
    return
  }
  next()
}

/** Require the authenticated user to have the RESPONDER role. Use after requireAuth. */
export function requireResponder(req: Request, _res: Response, next: NextFunction): void {
  if (!req.auth) {
    next(unauthorized('Authentication required.'))
    return
  }
  if (req.auth.role !== UserRole.RESPONDER) {
    next(forbidden('Responder access required.'))
    return
  }
  next()
}
