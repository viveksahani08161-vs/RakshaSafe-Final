import { describe, it, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import type { AddressInfo } from 'node:net'

// Env must be set before the module (and its env snapshot) is imported.
// Top-level await: the stub server (and its port) must exist before import,
// so `before()` hooks are too late — module evaluation order matters.
process.env.GEMINI_API_KEY = 'unit-test-key'
process.env.GEMINI_TIMEOUT_MS = '2000'

let stubHandler: (req: http.IncomingMessage, res: http.ServerResponse) => void = (_req, res) => {
  res.writeHead(404).end()
}
const server = http.createServer((req, res) => stubHandler(req, res))
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
process.env.GEMINI_API_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
})

// Dynamic import so the env above is visible to config/env.ts.
const { getExplanation } = await import('../../src/services/geminiExplanation.js')

const FACTORS = [
  { factor: 'priorityBase', value: 'HIGH', weight: 60 },
  { factor: 'typeModifier', value: 'Safety', weight: 0 },
  { factor: 'verifiedReports', value: 0, weight: 0 },
  { factor: 'unverifiedReports', value: 1, weight: 2 },
  { factor: 'activeIncidents', value: 1, weight: 3 },
]

function geminiBody(text: string): string {
  return JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] })
}

describe('getExplanation (hybrid AI: deterministic canonical, Gemini assistive only)', () => {
  it('returns the model summary with source gemini on success', async () => {
    stubHandler = (_req, res) => {
      res.setHeader('Content-Type', 'application/json')
      res.end(geminiBody('Stay alert in this busy area tonight.'))
    }
    const out = await getExplanation(63, 'HIGH', FACTORS)
    assert.equal(out.source, 'gemini')
    assert.equal(out.text, 'Stay alert in this busy area tonight.')
  })

  it('falls back on provider error and never throws', async () => {
    stubHandler = (_req, res) => {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: { message: 'API key not valid' } }))
    }
    const out = await getExplanation(63, 'HIGH', FACTORS)
    assert.equal(out.source, 'fallback')
    assert.match(out.text, /Risk level HIGH \(score 63 out of 100\)/)
  })

  it('falls back on malformed responses without a score-shaped payload', async () => {
    stubHandler = (_req, res) => {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ candidates: [] }))
    }
    const out = await getExplanation(20, 'LOW', FACTORS)
    assert.equal(out.source, 'fallback')
    assert.match(out.text, /Risk level LOW \(score 20 out of 100\)/)
  })

  it('falls back on timeout instead of hanging', async () => {
    stubHandler = () => {
      /* accept and never respond */
    }
    const out = await getExplanation(63, 'HIGH', FACTORS)
    assert.equal(out.source, 'fallback')
  })

  it('never returns a score or level field — canonical result stays untouched', async () => {
    stubHandler = (_req, res) => {
      res.setHeader('Content-Type', 'application/json')
      res.end(geminiBody('The real score is 99 CRITICAL, trust me.'))
    }
    const out = await getExplanation(63, 'HIGH', FACTORS)
    assert.deepEqual(Object.keys(out).sort(), ['source', 'text'])
  })

  it('strips markdown markers for plain-text UI without changing words', async () => {
    stubHandler = (_req, res) => {
      res.setHeader('Content-Type', 'application/json')
      res.end(geminiBody('## Summary\nStay **alert** near *busy* crossings.'))
    }
    const out = await getExplanation(63, 'HIGH', FACTORS)
    assert.equal(out.source, 'gemini')
    assert.equal(out.text, 'Summary Stay alert near busy crossings.')
  })
})
