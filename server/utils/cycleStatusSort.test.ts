import assert from 'node:assert/strict'
import { test } from 'node:test'
import { compareStudentCycleStatuses, matchesStudentCycleStatusFilter } from './cycle'

test('sorts cycle statuses before pagination in workflow order', () => {
  const statuses = ['PLACEMENT_CONFIRMED', 'NOT_APPLIED', 'DOCUMENT_UNDER_REVIEW', 'APPLYING', 'TERMINATED'] as const
  assert.deepEqual([...statuses].sort((a, b) => compareStudentCycleStatuses(a, b, 'asc')), [
    'NOT_APPLIED', 'APPLYING', 'DOCUMENT_UNDER_REVIEW', 'TERMINATED', 'PLACEMENT_CONFIRMED'
  ])
  assert.deepEqual([...statuses].sort((a, b) => compareStudentCycleStatuses(a, b, 'desc')), [
    'PLACEMENT_CONFIRMED', 'TERMINATED', 'DOCUMENT_UNDER_REVIEW', 'APPLYING', 'NOT_APPLIED'
  ])
})

test('groups only active placement workflow states as in progress', () => {
  assert.equal(matchesStudentCycleStatusFilter('REQUEST_SUBMITTED', 'IN_PROGRESS'), true)
  assert.equal(matchesStudentCycleStatusFilter('DOCUMENT_UNDER_REVIEW', 'IN_PROGRESS'), true)
  assert.equal(matchesStudentCycleStatusFilter('NOT_APPLIED', 'IN_PROGRESS'), false)
  assert.equal(matchesStudentCycleStatusFilter('TERMINATED', 'IN_PROGRESS'), false)
  assert.equal(matchesStudentCycleStatusFilter('PLACEMENT_CONFIRMED', 'IN_PROGRESS'), false)
  assert.equal(matchesStudentCycleStatusFilter('PLACEMENT_CONFIRMED', 'PLACEMENT_CONFIRMED'), true)
})
