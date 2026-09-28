import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { validateAssignmentCreate, validateAssignmentUpdate } from '../../src/validators/assignment.js'

describe('validateAssignmentCreate', () => {
  it('accepts a valid teamId and trims notes', () => {
    const { input, issues } = validateAssignmentCreate({
      teamId: '507f1f77bcf86cd799439011',
      notes: '  Respond with a water pump.  ',
    })
    assert.equal(issues, undefined)
    assert.equal(input?.teamId, '507f1f77bcf86cd799439011')
    assert.equal(input?.notes, 'Respond with a water pump.')
  })

  it('rejects a teamId that is not a valid id', () => {
    const { issues } = validateAssignmentCreate({ teamId: 'team-1' })
    assert.ok(issues?.some((i) => i.field === 'teamId'))
  })

  it('omits notes when absent', () => {
    const { input, issues } = validateAssignmentCreate({ teamId: '507f1f77bcf86cd799439011' })
    assert.equal(issues, undefined)
    assert.equal('notes' in (input ?? {}), false)
  })

  it('rejects notes longer than 500 characters', () => {
    const { issues } = validateAssignmentCreate({
      teamId: '507f1f77bcf86cd799439011',
      notes: 'x'.repeat(501),
    })
    assert.ok(issues?.some((i) => i.field === 'notes'))
  })
})

describe('validateAssignmentUpdate', () => {
  it('requires at least one field', () => {
    const { issues } = validateAssignmentUpdate({})
    assert.ok(issues?.some((i) => i.field === 'body'))
  })

  it('accepts a valid workflow status', () => {
    const { input, issues } = validateAssignmentUpdate({ status: 'EN_ROUTE' })
    assert.equal(issues, undefined)
    assert.equal(input?.status, 'EN_ROUTE')
  })

  it('rejects an unknown status value', () => {
    const { issues } = validateAssignmentUpdate({ status: 'FLYING' })
    assert.ok(issues?.some((i) => i.field === 'status'))
  })

  it('clears notes with an empty string', () => {
    const { input, issues } = validateAssignmentUpdate({ notes: '' })
    assert.equal(issues, undefined)
    assert.equal(input?.notes, undefined)
  })
})