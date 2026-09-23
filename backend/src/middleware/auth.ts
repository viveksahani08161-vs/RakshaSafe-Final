import type { NextFunction, Request, Response } from 'express'
import mongoose from 'mongoose'
import { User, UserRole } from '../models/User.js'
import { forbidden, unauthorized } from '../utils/errors.js'
import { verifyAuthToken } from '../utils/jwt.js'

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization
  if (!header) return null
  const [scheme, token] = header.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null
  return token
}

/**
 * Require a valid JWT and load the account's current state from the
 * database whenever MongoDB is reachable. Deleted or deactivated accounts
 * lose access immediately; role changes take effect on the next request
 * instead of lingering until the token expires. Attaches `{ userId, role }`
 * to `req.auth`, preferring DB state over token claims.
 *
 * When the database is unreachable the token is still accepted (the same
 * policy as the database-independent OSM/weather/geocode routes); routes
 * that need the database are independently rejected by `requireDb`.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
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

  if (mongoose.connection.readyState === 1) {
    try {
      const user = await User.findById(payload.sub).select('_id role isActive').lean()
      if (!user) {
        next(unauthorized('Account no longer exists. Please sign in again.'))
        return
      }
      if (user.isActive === false) {
        next(unauthorized('Account is deactivated. Contact support.'))
        return
      }
      req.auth = { userId: String(user._id), role: user.role }
      next()
      return
    } catch {
      // DB glitch mid-request: fall back to token-only auth for this call.
    }
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
