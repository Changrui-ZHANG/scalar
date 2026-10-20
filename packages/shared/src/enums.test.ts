import { describe, expect, it } from 'vitest'
import {
  CHAPTER_LEVELS,
  DEFAULT_STAT_PERIOD,
  EVENT_TYPES,
  EXECUTION_STATUSES,
  INBOX_KINDS,
  PROGRAMMING_LANGUAGES,
  PUBLICATION_STATUSES,
  SOLUTION_CHECK_STATUSES,
  STAT_METRICS,
  STAT_PERIODS,
  STAT_SUBJECTS,
} from './enums.ts'

describe('enums', () => {
  it('defines PUBLICATION_STATUSES correctly', () => {
    expect(PUBLICATION_STATUSES).toEqual(['draft', 'published', 'archived'])
  })

  it('defines CHAPTER_LEVELS in correct display order', () => {
    expect(CHAPTER_LEVELS).toEqual(['beginner', 'intermediate', 'advanced', 'ecosystem'])
  })

  it('defines PROGRAMMING_LANGUAGES correctly', () => {
    expect(PROGRAMMING_LANGUAGES).toEqual(['javascript', 'typescript'])
  })

  it('defines SOLUTION_CHECK_STATUSES correctly', () => {
    expect(SOLUTION_CHECK_STATUSES).toEqual(['not_checked', 'passed', 'failed'])
  })

  it('defines STAT_SUBJECTS and STAT_METRICS correctly', () => {
    expect(STAT_SUBJECTS).toEqual(['exercise', 'lesson', 'chapter', 'sandbox'])
    expect(STAT_METRICS).toContain('verification_passed')
    expect(STAT_METRICS).toContain('execution')
  })

  it('defines STAT_PERIODS and DEFAULT_STAT_PERIOD', () => {
    expect(STAT_PERIODS).toEqual(['7d', '30d', 'all'])
    expect(DEFAULT_STAT_PERIOD).toBe('30d')
  })

  it('defines INBOX_KINDS in order of severity', () => {
    expect(INBOX_KINDS).toEqual([
      'check_failed',
      'check_incomplete',
      'check_pending',
      'chapter_empty',
      'chapter_offline',
    ])
  })

  it('defines EVENT_TYPES and EXECUTION_STATUSES', () => {
    expect(EVENT_TYPES).toEqual(['exercise_completed', 'lesson_completed', 'chapter_completed'])
    expect(EXECUTION_STATUSES).toEqual(['OK', 'TO', 'OL', 'EL', 'RE', 'SG', 'XX'])
  })
})
