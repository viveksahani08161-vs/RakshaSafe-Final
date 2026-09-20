import 'dotenv/config'

function required(name: string, fallback: string): string {
  return process.env[name] ?? fallback
}

function positiveNumber(name: string, fallback: number): number {
  const raw = process.env[name]
  if (raw === undefined || raw.trim() === '') return fallback
  const parsed = Number(raw.trim())
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

export const env = {
  nodeEnv: required('NODE_ENV', 'development'),
  port: Number(required('PORT', '5000')),
  mongoUri: required('MONGO_URI', 'mongodb://127.0.0.1:27017/rakshasafe'),
  jwtSecret: required('JWT_SECRET', 'rakshasafe-dev-secret-change-me'),
  jwtExpiresIn: required('JWT_EXPIRES_IN', '7d'),
  aiServiceUrl: required('AI_SERVICE_URL', 'http://localhost:8000'),
  aiServiceTimeoutMs: Number(required('AI_SERVICE_TIMEOUT_MS', '10000')),
  corsOrigin: required('CORS_ORIGIN', 'http://localhost:5173'),
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