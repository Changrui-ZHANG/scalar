import { describe, expect, it } from 'vitest'
import { hashText } from './hash.ts'

describe('hash', () => {
  it('returns a deterministic 8-character hex string', () => {
    const hash1 = hashText('hello world')
    const hash2 = hashText('hello world')
    expect(hash1).toBe(hash2)
    expect(hash1).toMatch(/^[0-9a-f]{8}$/)
  })

  it('produces distinct hashes for different inputs', () => {
    const hash1 = hashText('function test() {}')
    const hash2 = hashText('function test() { return 42; }')
    expect(hash1).not.toBe(hash2)
  })

  it('handles empty strings', () => {
    const hash = hashText('')
    expect(hash).toMatch(/^[0-9a-f]{8}$/)
  })
})
