import assert from 'node:assert/strict'
import { test } from 'node:test'
import { maxIssuedLetterNumber } from './officialLetterNumber'

test('finds the next annual sequence after existing Thai and Arabic letter numbers', () => {
  assert.equal(maxIssuedLetterNumber(['ว ๑๒/๒๕๖๙', '13/2569', '99/2568', null], 2569), 13)
})
