import 'dotenv/config'

function required(name: string, fallback: string): string {
  return process.env[name] ?? fallback
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
} as const