import { describe, expect, it } from 'vitest'
import {
  MAX_CASE_JSON_BYTES,
  MAX_CODE_BYTES,
  MAX_EXERCISE_CODE_LENGTH,
  MAX_HINTS,
  MAX_REQUEST_BODY_BYTES,
  MAX_SLUG_LENGTH,
  MAX_TEST_CASES,
} from './limits.ts'

describe('limits', () => {
  it('defines byte limits in accordance with specs', () => {
    expect(MAX_CODE_BYTES).toBe(65_536)
    expect(MAX_REQUEST_BODY_BYTES).toBe(262_144)
    expect(MAX_CASE_JSON_BYTES).toBe(1_024)
  })

  it('defines lengths and counts', () => {
    expect(MAX_SLUG_LENGTH).toBe(80)
    expect(MAX_HINTS).toBe(3)
    expect(MAX_TEST_CASES).toBe(20)
    expect(MAX_EXERCISE_CODE_LENGTH).toBe(5_000)
  })
})
