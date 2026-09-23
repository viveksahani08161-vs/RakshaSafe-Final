import type { NextFunction, Request, Response } from 'express'
import mongoose from 'mongoose'
import { HttpError } from '../utils/errors.js'

export function notFound(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: 'Not found',
    path: req.originalUrl,
  })
}

function isDuplicateKeyError(err: unknown): err is { code: number; keyValue?: Record<string, unknown> } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: unknown }).code === 11000
  )
}

function isJsonParseError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { type?: unknown }).type === 'entity.parse.failed' &&
    (err as { status?: unknown }).status === 400
  )
}

function isPayloadTooLarge(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { type?: unknown }).type === 'entity.too.large'
  )
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      ...(err.details !== undefined ? { details: err.details } : {}),
    })
    return
  }

  if (isDuplicateKeyError(err)) {
    const fields = Object.keys(err.keyValue ?? {})
    res.status(409).json({
      success: false,
      error:
        fields.length > 0
          ? `An account with this ${fields.join(' and ')} already exists.`
          : 'A duplicate record already exists.',
    })
    return
  }

  if (err instanceof mongoose.Error.ValidationError) {
    res.status(400).json({
      success: false,
      error: 'Validation failed.',
      details: Object.values(err.errors).map((e) => ({
        field: (e as { path?: string }).path ?? 'unknown',
        message: e.message,
      })),
    })
    return
  }

  if (isJsonParseError(err)) {
    res.status(400).json({
      success: false,
      error: 'Invalid JSON in request body.',
    })
    return
  }

  if (isPayloadTooLarge(err)) {
    res.status(413).json({
      success: false,
      error: 'Request payload too large.',
    })
    return
  }

  console.error('[error]', err)
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  })
}