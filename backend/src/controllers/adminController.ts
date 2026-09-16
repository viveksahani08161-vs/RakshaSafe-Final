import type { NextFunction, Request, Response } from 'express'
import { Notification } from '../models/Notification.js'
import { User } from '../models/User.js'
import { toSafeUser } from './authController.js'
import { toSafeNotification } from './notificationController.js'

const MAX_LIMIT = 50

/** GET /api/admin/users — paginated user list (admin only, no password hashes). */
export async function listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(req.query.limit) || 20))
    const skip = (page - 1) * limit

    const [users, total] = await Promise.all([
      User.find().select('-passwordHash').sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(),
    ])

    res.json({
      success: true,
      data: {
        users: users.map(toSafeUser),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    })
  } catch (err) {
    next(err)
  }
}

/** GET /api/admin/notifications — system-wide notification records, newest first (dashboard support). */
export async function listNotificationsAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(req.query.limit) || 20))
    const skip = (page - 1) * limit

    const [docs, total] = await Promise.all([
      Notification.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      Notification.countDocuments(),
    ])

    res.json({
      success: true,
      data: {
        notifications: docs.map((d) => toSafeNotification(d, null)),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    })
  } catch (err) {
    next(err)
  }
}
