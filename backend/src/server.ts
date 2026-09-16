import { createApp } from './app.js'
import { connectDatabase, disconnectDatabase } from './config/db.js'
import { env } from './config/env.js'

const app = createApp()

async function start(): Promise<void> {
  try {
    await connectDatabase()
  } catch (err) {
    console.warn(`[api] MongoDB unreachable at startup: ${(err as Error).message}`)
    console.warn('[api] Starting API anyway; /api/health will report db: connected=false')
  }

  const server = app.listen(env.port, () => {
    console.log(`[api] RakshaSafe backend listening on http://localhost:${env.port}`)
  })

  const shutdown = async (signal: string) => {
    console.log(`[api] ${signal} received, shutting down...`)
    server.close(async () => {
      await disconnectDatabase()
      process.exit(0)
    })
  }

  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))
}

start().catch((err) => {
  console.error('[api] Failed to start:', err)
  process.exit(1)
})