import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { snapshotToRows, toCsv, toPdf } from '../../src/utils/export.js'

describe('snapshotToRows', () => {
  it('skips metadata keys and flattens nested objects and arrays', () => {
    const rows = snapshotToRows({
      generatedAtUtc: '2026-09-28T00:00:00Z',
      filters: { status: 'REPORTED' },
      incidents: { total: 2, priorities: { HIGH: 1, LOW: 1 } },
      teams: ['Alpha', 'Beta'],
    })
    const joined = rows.map((r) => r.join('/'))
    assert.equal(joined.some((r) => r.includes('generatedAtUtc')), false)
    assert.equal(joined.some((r) => r.includes('filters')), false)
    assert.equal(joined.some((r) => r === 'incidents/total/2'), true)
    assert.equal(joined.some((r) => r === 'incidents/priorities.HIGH/1'), true)
    assert.equal(joined.some((r) => r === 'teams/[0]/Alpha'), true)
  })
})

describe('toCsv', () => {
  it('writes an RFC-4180 header and rows', () => {
    const csv = toCsv('Snap', { incidents: { total: 2 } })
    assert.match(csv, /^# Snap/)
    assert.ok(csv.includes('section,metric,value'))
    assert.ok(csv.includes('incidents,total,2'))
  })

  it('neutralizes spreadsheet formula injection', () => {
    const csv = toCsv('Snap', { malicious: { value: '=SUM(A1:A9)' } })
    assert.ok(csv.includes(`'=SUM(A1:A9)`))
  })

  it('quotes cells containing commas or quotes', () => {
    const csv = toCsv('Snap', { notes: { text: 'a, "quoted" value' } })
    assert.ok(csv.includes('"a, ""quoted"" value"'))
  })
})

describe('toPdf', () => {
  it('produces a valid PDF 1.4 document as a Buffer', () => {
    const pdf = toPdf('Snap', { incidents: { total: 3 }, warnings: [] }).toString('latin1')
    assert.match(pdf, /^%PDF-1\.4/)
    assert.ok(pdf.includes('/Type /Catalog'))
    assert.ok(pdf.includes('/Type /Pages'))
    assert.ok(pdf.includes('/Type /Font /Subtype /Type1 /BaseFont /Helvetica'))
  })

  it('paginates and numbers pages', () => {
    const snapshot: Record<string, unknown> = {}
    for (let i = 0; i < 60; i += 1) snapshot[`row${i}`] = { value: i }
    const pdf = toPdf('Snap', snapshot).toString('latin1')
    assert.match(pdf, /Page 1 of \d+/)
  })
})