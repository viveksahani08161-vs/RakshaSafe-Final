import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { UserRole } from '../models/User.js'

export interface AuthTokenPayload {
  sub: string
  role: UserRole
}

/** Sign a JWT for an authenticated user. Payload carries only id + role. */
export function signAuthToken(userId: string, role: UserRole): string {
  const payload: AuthTokenPayload = { sub: userId, role }
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  })
}

/** Verify a JWT and return its payload, or null when invalid/expired. */
export function verifyAuthToken(token: string): AuthTokenPayload | null {
  try {
    const decoded = jwt.verify(token, env.jwtSecret)
    if (typeof decoded === 'string') return null
    const { sub, role } = decoded as Partial<AuthTokenPayload>
    if (typeof sub !== 'string' || (role !== UserRole.USER && role !== UserRole.ADMIN)) {
      return null
    }
    return { sub, role }
  } catch {
    return null
  }
}
