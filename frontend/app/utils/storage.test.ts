import { describe, expect, it } from 'vitest'
import {
  EMPTY_PROGRESS,
  convertLegacyDrafts,
  mergeProgress,
  parseDrafts,
  parseHints,
  parsePlanCollapsed,
  parseProgress,
  parseSandbox,
  parseSandboxSeed,
  parseTheme,
  withDraft,
} from './storage'

describe('utils/storage', () => {
  describe('parseProgress', () => {
    it('returns EMPTY_PROGRESS on null or invalid JSON', () => {
      expect(parseProgress(null)).toEqual(EMPTY_PROGRESS)
      expect(parseProgress('invalid json')).toEqual(EMPTY_PROGRESS)
      expect(parseProgress('123')).toEqual(EMPTY_PROGRESS)
    })

    it('parses valid progress', () => {
      const raw = JSON.stringify({
        started: ['javascript', 'typescript'],
        completed: {
          javascript: ['lesson:intro:first', 'exercise:intro:hello'],
        },
        lastVisited: {
          javascript: '2026-10-21T12:00:00Z',
        },
      })
      expect(parseProgress(raw)).toEqual({
        started: ['javascript', 'typescript'],
        completed: {
          javascript: ['lesson:intro:first', 'exercise:intro:hello'],
        },
        lastVisited: {
          javascript: '2026-10-21T12:00:00Z',
        },
      })
    })

    it('filters out non-string items or bad types', () => {
      const raw = JSON.stringify({
        started: ['javascript', 123],
        completed: {
          javascript: ['lesson:intro:first', 456],
          invalid: 'string-instead-of-array',
        },
        lastVisited: {
          javascript: 789,
        },
      })
      expect(parseProgress(raw)).toEqual({
        started: [],
        completed: {},
        lastVisited: {},
      })
    })
  })

  describe('mergeProgress', () => {
    it('merges started and completed by union, and takes the newest lastVisited', () => {
      const stored = {
        started: ['javascript'],
        completed: {
          javascript: ['lesson:intro:1'],
        },
        lastVisited: {
          javascript: '2026-10-20T10:00:00Z',
        },
      }
      const local = {
        started: ['typescript'],
        completed: {
          javascript: ['lesson:intro:2'],
          typescript: ['lesson:intro:ts'],
        },
        lastVisited: {
          javascript: '2026-10-21T15:00:00Z',
          typescript: '2026-10-21T14:00:00Z',
        },
      }

      const merged = mergeProgress(stored, local)
      expect(merged.started).toEqual(['javascript', 'typescript'])
      expect(merged.completed.javascript).toEqual(['lesson:intro:1', 'lesson:intro:2'])
      expect(merged.completed.typescript).toEqual(['lesson:intro:ts'])
      expect(merged.lastVisited.javascript).toBe('2026-10-21T15:00:00Z')
      expect(merged.lastVisited.typescript).toBe('2026-10-21T14:00:00Z')
    })
  })

  describe('parseDrafts and withDraft', () => {
    it('parses valid drafts and ignores malformed items', () => {
      const raw = JSON.stringify({
        'js:exercise:ch1:ex1': { code: 'console.log(1)', starterHash: 'abc' },
        'js:exercise:ch1:ex2': { code: 'console.log(2)', starterHash: null },
        bad1: { code: 123 },
        bad2: 'not an object',
      })
      const parsed = parseDrafts(raw)
      expect(parsed).toEqual({
        'js:exercise:ch1:ex1': { code: 'console.log(1)', starterHash: 'abc' },
        'js:exercise:ch1:ex2': { code: 'console.log(2)', starterHash: null },
      })
    })

    it('withDraft replaces or removes key', () => {
      const initial = {
        'js:ex1': { code: 'a', starterHash: null },
      }
      const added = withDraft(initial, 'js:ex2', { code: 'b', starterHash: 'hash' })
      expect(added['js:ex2']?.code).toBe('b')
      expect(added['js:ex1']?.code).toBe('a')

      const removed = withDraft(added, 'js:ex1', null)
      expect(removed['js:ex1']).toBeUndefined()
      expect(removed['js:ex2']?.code).toBe('b')
    })
  })

  describe('convertLegacyDrafts', () => {
    it('converts v1 key format and strings to v2 StoredDrafts', () => {
      const legacyRaw = JSON.stringify({
        'javascript/exercise:variables:echanger-valeurs': 'let a = 1;',
        'typescript:exercise:types:first': 'const x: number = 2;',
      })
      const converted = convertLegacyDrafts(legacyRaw)
      expect(converted).toEqual({
        'javascript:exercise:variables:echanger-valeurs': {
          code: 'let a = 1;',
          starterHash: null,
        },
        'typescript:exercise:types:first': {
          code: 'const x: number = 2;',
          starterHash: null,
        },
      })
    })
  })

  describe('theme, plan, hints, sandbox', () => {
    it('parseTheme returns light, dark or system', () => {
      expect(parseTheme('light')).toBe('light')
      expect(parseTheme('dark')).toBe('dark')
      expect(parseTheme('system')).toBe('system')
      expect(parseTheme('unknown')).toBe('system')
      expect(parseTheme(null)).toBe('system')
    })

    it('parsePlanCollapsed returns boolean', () => {
      expect(parsePlanCollapsed('true')).toBe(true)
      expect(parsePlanCollapsed('false')).toBe(false)
      expect(parsePlanCollapsed(null)).toBe(false)
    })

    it('parseHints returns integers >= 0', () => {
      const raw = JSON.stringify({
        'js:exercise:1': 2,
        'js:exercise:2': -1,
        'js:exercise:3': 'invalid',
      })
      expect(parseHints(raw)).toEqual({ 'js:exercise:1': 2 })
    })

    it('parseSandbox and parseSandboxSeed validate language and code', () => {
      const valid = JSON.stringify({ language: 'javascript', code: 'test()' })
      expect(parseSandbox(valid)).toEqual({ language: 'javascript', code: 'test()' })
      expect(parseSandboxSeed(valid)).toEqual({ language: 'javascript', code: 'test()' })

      expect(parseSandbox('{}')).toBeNull()
      expect(parseSandboxSeed(null)).toBeNull()
    })
  })
})
