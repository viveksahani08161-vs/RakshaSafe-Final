import mongoose from 'mongoose'
import { env } from './env.js'

export async function connectDatabase(): Promise<void> {
  mongoose.connection.on('disconnected', () => {
    console.warn('[db] MongoDB connection lost')
  })

  await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 5000,
  })
  console.log(`[db] Connected to MongoDB (${mongoose.connection.name})`)
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect()
  console.log('[db] MongoDB connection closed')
}