/** HTTP-aware error used by controllers and middleware. */
export class HttpError extends Error {
  statusCode: number
  details?: unknown

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message)
    this.name = 'HttpError'
    this.statusCode = statusCode
    this.details = details
  }
}

export function badRequest(message: string, details?: unknown): HttpError {
  return new HttpError(400, message, details)
}

export function unauthorized(message = 'Authentication required'): HttpError {
  return new HttpError(401, message)
}

export function forbidden(message = 'Access denied'): HttpError {
  return new HttpError(403, message)
}

export function notFoundError(message = 'Not found'): HttpError {
  return new HttpError(404, message)
}

export function conflict(message: string): HttpError {
  return new HttpError(409, message)
}

export function serviceUnavailable(message: string): HttpError {
  return new HttpError(503, message)
}
