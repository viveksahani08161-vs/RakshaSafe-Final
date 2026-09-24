import type { NextFunction, Request, Response } from 'express'

interface RateLimitOptions {
  windowMs: number
  max: number
  message?: string
}

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

function keyFor(req: Request): string {
  return `${req.ip ?? 'unknown'}:${req.originalUrl ?? req.path}`
}

/** Exponential backoff on failure keeps the map from growing unboundedly. */
function reap(now: number): void {
  if (buckets.size < 10_000) return
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

/**
 * Lightweight in-memory fixed-window rate limiter keyed by client IP and
 * route. Suitable for a single-instance deploy; no external dependency.
 */
export function rateLimit({ windowMs, max, message }: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now()
    reap(now)
    const key = keyFor(req)
    const bucket = buckets.get(key)
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs })
      next()
      return
    }
    bucket.count += 1
    if (bucket.count > max) {
      res.status(429).json({
        success: false,
        error: message ?? 'Too many requests. Please try again shortly.',
      })
      return
    }
    next()
  }
}