import cors from 'cors'
import express from 'express'
import { env } from './config/env.js'
import { notFound, errorHandler } from './middleware/error.js'
import routes from './routes/index.js'

export function createApp() {
  const app = express()

  // Do not fingerprint the framework in responses.
  app.disable('x-powered-by')

  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true,
    }),
  )
  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: true }))

  app.get('/', (_req, res) => {
    res.json({
      service: 'RakshaSafe API',
      version: '0.1.0',
      docs: '/api/health',
    })
  })

  app.use('/api', routes)

  app.use(notFound)
  app.use(errorHandler)

  return app
}