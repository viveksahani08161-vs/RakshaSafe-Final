import mongoose from 'mongoose'
import { env } from './env.js'

// Server selection must tolerate a waking cloud cluster. A free-tier Atlas
// cluster that was paused/idle can take several seconds to accept the first
// connection, so a tight timeout makes startup fail even though the cluster
// becomes reachable moments later.
const SERVER_SELECTION_TIMEOUT_MS = 10_000

// Bounded backoff for background reconnection attempts after an initial
// connection failure. The API stays up and `requireDb` keeps rejecting
// DB-dependent requests until one of these attempts succeeds, so readiness
// recovers without a manual restart.
const RETRY_BASE_DELAY_MS = 2_000
const RETRY_MAX_DELAY_MS = 15_000

let retryAttempt = 0
let retryTimer: NodeJS.Timeout | null = null

async function tryConnect(): Promise<boolean> {
  try {
    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS })
    console.log(`[db] Connected to MongoDB (${mongoose.connection.name})`)
    retryAttempt = 0
    return true
  } catch (err) {
    console.warn(`[db] MongoDB connection attempt failed: ${(err as Error).message}`)
    return false
  }
}

function scheduleRetry(): void {
  const delay = Math.min(RETRY_BASE_DELAY_MS * 2 ** retryAttempt, RETRY_MAX_DELAY_MS)
  retryAttempt += 1
  retryTimer = setTimeout(() => {
    void tryConnect().then((ok) => {
      if (!ok) scheduleRetry()
    })
  }, delay)
}

export async function connectDatabase(): Promise<void> {
  mongoose.connection.on('disconnected', () => {
    console.warn('[db] MongoDB connection lost')
  })
  mongoose.connection.on('connected', () => {
    console.log('[db] MongoDB connection established')
  })

  const ok = await tryConnect()
  if (!ok) {
    // Keep the original contract: the API starts while MongoDB is down and
    // `requireDb` gates DB-dependent routes. The Background retry loop will
    // flip readyState to 1 as soon as MongoDB is reachable again.
    console.warn('[db] Initial MongoDB connection failed; retrying in the background.')
    scheduleRetry()
    throw new Error('Initial MongoDB connection failed.')
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (retryTimer) {
    clearTimeout(retryTimer)
    retryTimer = null
  }
  await mongoose.disconnect()
  console.log('[db] MongoDB connection closed')
}