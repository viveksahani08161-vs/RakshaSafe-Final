import 'dotenv/config'

function required(name: string, fallback: string): string {
  return process.env[name] ?? fallback
}

/** Refuse to boot in production with a placeholder or missing secret key. */
function requiredSecret(name: string, devFallback: string): string {
  const value = process.env[name]
  if (value !== undefined && value.trim() !== '' && value !== devFallback) {
    return value
  }
  const isProd = process.env.NODE_ENV === 'production'
  if (isProd) {
    throw new Error(
      `Missing ${name}. Set a real value in the environment (NODE_ENV=production refuses the development fallback).`,
    )
  }
  return value && value.trim() !== '' ? value : devFallback
}

function positiveNumber(name: string, fallback: number): number {
  const raw = process.env[name]
  if (raw === undefined || raw.trim() === '') return fallback
  const parsed = Number(raw.trim())
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

const isProduction = process.env.NODE_ENV === 'production'

export const env = {
  nodeEnv: required('NODE_ENV', 'development'),
  port: Number(required('PORT', '5000')),
  mongoUri: isProduction
    ? requiredSecret('MONGO_URI', '')
    : required('MONGO_URI', 'mongodb://127.0.0.1:27017/rakshasafe'),
  jwtSecret: requiredSecret('JWT_SECRET', 'rakshasafe-dev-secret-change-me'),
  jwtExpiresIn: required('JWT_EXPIRES_IN', '7d'),
  aiServiceUrl: required('AI_SERVICE_URL', 'http://localhost:8000'),
  aiServiceTimeoutMs: Number(required('AI_SERVICE_TIMEOUT_MS', '10000')),
  /**
   * CORS allowlist: comma-separated frontend origins. The dev server (5173)
   * and `vite preview` (4173) are both allowed by default so admin pages
   * never fail with a network error just because the bundle is served from
   * the preview port. Production should set an explicit single origin.
   */
  corsOrigins: required('CORS_ORIGIN', 'http://localhost:5173,http://localhost:4173')
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o !== ''),
  logLevel: required('LOG_LEVEL', 'dev'),
  /**
   * External nearby-places provider (Google Places API, New).
   * Server-side only — never exposed to the frontend. Disabled unless
   * explicitly enabled AND a key is present; the app is fully functional
   * on RakshaSafe database resources alone.
   */
  googlePlacesApiKey: required('GOOGLE_PLACES_API_KEY', ''),
  nearbyExternalEnabled: required('NEARBY_EXTERNAL_ENABLED', 'false').trim().toLowerCase() === 'true',
  nearbyExternalTimeoutMs: positiveNumber('NEARBY_EXTERNAL_TIMEOUT_MS', 8000),
  nearbyRadiusKm: positiveNumber('NEARBY_RADIUS_KM', 25),
} as const