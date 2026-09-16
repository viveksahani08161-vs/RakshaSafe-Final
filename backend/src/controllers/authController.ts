import type { NextFunction, Request, Response } from 'express'
import { User, UserRole, type IUser } from '../models/User.js'
import { badRequest, conflict, notFoundError, unauthorized } from '../utils/errors.js'
import { hashPassword, comparePassword } from '../utils/password.js'
import { signAuthToken } from '../utils/jwt.js'
import {
  validateLogin,
  validateProfileUpdate,
  validateRegister,
  isEmail,
} from '../validators/auth.js'

interface SafeUser {
  id: string
  name: string
  email: string
  phone: string
  role: UserRole
  language?: string
  createdAt: Date
  updatedAt: Date
}

/** Strip internal fields (passwordHash, __v). Never expose secrets. */
export function toSafeUser(user: IUser): SafeUser {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    ...(user.language ? { language: user.language } : {}),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

function issueToken(user: IUser): string {
  return signAuthToken(String(user._id), user.role)
}

/**
 * POST /api/auth/register
 * Public self-registration. Always creates a USER account —
 * the role field is never accepted from the client (admins are pre-created).
 */
export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { input, issues } = validateRegister(req.body)
    if (!input || issues) {
      next(badRequest('Invalid registration data.', issues))
      return
    }

    const emailTaken = await User.findOne({ email: input.email }).lean()
    if (emailTaken) {
      next(conflict('An account with this email already exists.'))
      return
    }
    const phoneTaken = await User.findOne({ phone: input.phone }).lean()
    if (phoneTaken) {
      next(conflict('An account with this phone number already exists.'))
      return
    }

    const passwordHash = await hashPassword(input.password)
    const user = await User.create({
      name: input.name,
      email: input.email,
      phone: input.phone,
      passwordHash,
      role: UserRole.USER,
      ...(input.language ? { language: input.language } : {}),
    })

    res.status(201).json({
      success: true,
      data: { user: toSafeUser(user), token: issueToken(user) },
    })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/auth/login
 * Accepts an email address or phone number as identifier.
 * Returns a generic error for unknown accounts and wrong passwords alike.
 */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { input, issues } = validateLogin(req.body)
    if (!input || issues) {
      next(badRequest('Invalid login data.', issues))
      return
    }

    const identifier = input.identifier.trim()
    const query = isEmail(identifier)
      ? { email: identifier.toLowerCase() }
      : { phone: identifier }

    const user = await User.findOne(query)
    if (!user) {
      next(unauthorized('Invalid credentials.'))
      return
    }
    const ok = await comparePassword(input.password, user.passwordHash)
    if (!ok) {
      next(unauthorized('Invalid credentials.'))
      return
    }

    res.json({
      success: true,
      data: { user: toSafeUser(user), token: issueToken(user) },
    })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/auth/logout
 * JWTs are stateless: logout is completed by discarding the token client-side.
 * This endpoint acknowledges the logout so clients have a single contract.
 */
export async function logout(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ success: true, data: { message: 'Logged out. Discard the stored token.' } })
  } catch (err) {
    next(err)
  }
}

/** GET /api/auth/me — current authenticated profile. */
export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findById(req.auth?.userId).select('-passwordHash')
    if (!user) {
      next(notFoundError('Account not found.'))
      return
    }
    res.json({ success: true, data: { user: toSafeUser(user) } })
  } catch (err) {
    next(err)
  }
}

/** PATCH /api/auth/profile — update permitted profile fields. */
export async function updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { input, issues } = validateProfileUpdate(req.body)
    if (!input || issues) {
      next(badRequest('Invalid profile data.', issues))
      return
    }

    const userId = req.auth?.userId
    const user = await User.findById(userId)
    if (!user) {
      next(notFoundError('Account not found.'))
      return
    }

    if (input.email && input.email !== user.email) {
      const taken = await User.findOne({ email: input.email, _id: { $ne: user._id } }).lean()
      if (taken) {
        next(conflict('An account with this email already exists.'))
        return
      }
      user.email = input.email
    }
    if (input.phone && input.phone !== user.phone) {
      const taken = await User.findOne({ phone: input.phone, _id: { $ne: user._id } }).lean()
      if (taken) {
        next(conflict('An account with this phone number already exists.'))
        return
      }
      user.phone = input.phone
    }
    if (input.name) user.name = input.name
    if (input.language !== undefined) user.language = input.language

    await user.save()
    res.json({ success: true, data: { user: toSafeUser(user) } })
  } catch (err) {
    next(err)
  }
}
