// enums.ts : valeurs identiques aux énumérations Prisma (test du backend, specs-backend.md § 11)
export const PUBLICATION_STATUSES = ['draft', 'published', 'archived'] as const
export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number]

export const CHAPTER_LEVELS = ['beginner', 'intermediate', 'advanced', 'ecosystem'] as const // ordre d'affichage
export type ChapterLevel = (typeof CHAPTER_LEVELS)[number]

export const PROGRAMMING_LANGUAGES = ['javascript', 'typescript'] as const
export type ProgrammingLanguage = (typeof PROGRAMMING_LANGUAGES)[number]

export const SOLUTION_CHECK_STATUSES = ['not_checked', 'passed', 'failed'] as const
export type SolutionCheckStatus = (typeof SOLUTION_CHECK_STATUSES)[number]

export const STAT_SUBJECTS = ['exercise', 'lesson', 'chapter', 'sandbox'] as const
export type StatSubject = (typeof STAT_SUBJECTS)[number]

export const STAT_METRICS = [
  'verification_passed',
  'verification_failed_runtime',
  'verification_failed_missing_function',
  'verification_failed_case',
  'execution',
  'completed',
] as const
export type StatMetric = (typeof STAT_METRICS)[number]

// enums.ts (suite) : propres à l'API, sans énumération Prisma
export const STAT_PERIODS = ['7d', '30d', 'all'] as const // specs-backend.md § 12.3
export type StatPeriod = (typeof STAT_PERIODS)[number]
export const DEFAULT_STAT_PERIOD: StatPeriod = '30d'

export const INBOX_KINDS = [
  'check_failed',
  'check_incomplete',
  'check_pending',
  'chapter_empty',
  'chapter_offline',
] as const // ordre de gravité (specs-backend.md § 7.9)
export type InboxKind = (typeof INBOX_KINDS)[number]

export const EVENT_TYPES = ['exercise_completed', 'lesson_completed', 'chapter_completed'] as const // POST /events
export type EventType = (typeof EVENT_TYPES)[number]

export const EXECUTION_STATUSES = ['OK', 'TO', 'OL', 'EL', 'RE', 'SG', 'XX'] as const // specs-backend.md § 6.2
export type ExecutionStatus = (typeof EXECUTION_STATUSES)[number]
