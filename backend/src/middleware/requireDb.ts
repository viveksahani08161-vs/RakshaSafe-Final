import type { NextFunction, Request, Response } from 'express'
import mongoose from 'mongoose'
import { serviceUnavailable } from '../utils/errors.js'

/**
 * Reject requests that need the database while MongoDB is unreachable,
 * instead of letting them hang until a timeout.
 */
export function requireDb(_req: Request, _res: Response, next: NextFunction): void {
  if (mongoose.connection.readyState !== 1) {
    next(serviceUnavailable('Database unavailable. Please try again later.'))
    return
  }
  next()
}
