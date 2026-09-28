import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { validateReportRequest, REPORT_TYPES } from '../../src/services/reports.js'

describe('validateReportRequest', () => {
  it('accepts a valid report request with an optional title', () => {
    const { reportType, format, title, issues } = validateReportRequest({
      reportType: 'incident-summary',
      format: 'CSV',
      title: 'Weekly incidents',
    })
    assert.equal(issues, undefined)
    assert.equal(reportType, 'incident-summary')
    assert.equal(format, 'CSV')
    assert.equal(title, 'Weekly incidents')
  })

  it('accepts PDF and JSON formats without a title', () => {
    assert.equal(validateReportRequest({ reportType: 'safety-overview', format: 'PDF' }).format, 'PDF')
    assert.equal(validateReportRequest({ reportType: 'resource-summary', format: 'JSON' }).format, 'JSON')
  })

  it('rejects an unknown report type', () => {
    const { issues } = validateReportRequest({ reportType: 'user-report', format: 'PDF' })
    assert.ok(issues?.some((i) => i.field === 'reportType'))
  })

  it('rejects an unsupported format', () => {
    const { issues } = validateReportRequest({ reportType: 'incident-summary', format: 'XLSX' })
    assert.ok(issues?.some((i) => i.field === 'format'))
  })

  it('rejects titles that are empty, too long, or contain line breaks', () => {
    assert.ok(validateReportRequest({ reportType: 'incident-summary', format: 'PDF', title: '' }).issues)
    assert.ok(validateReportRequest({ reportType: 'incident-summary', format: 'PDF', title: 'x'.repeat(151) }).issues)
    assert.ok(validateReportRequest({ reportType: 'incident-summary', format: 'PDF', title: 'a\nb' }).issues)
  })

  it('preserves a valid filters object', () => {
    const { filters, issues } = validateReportRequest({
      reportType: 'incident-summary',
      format: 'JSON',
      filters: { status: 'REPORTED', month: '2026-09' },
    })
    assert.equal(issues, undefined)
    assert.deepEqual(filters, { status: 'REPORTED', month: '2026-09' })
  })

  it('documents every report type it accepts', () => {
    assert.deepEqual(REPORT_TYPES, ['incident-summary', 'resource-summary', 'safety-overview'])
  })
})