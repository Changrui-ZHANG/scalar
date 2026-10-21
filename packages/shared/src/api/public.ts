import type { ChapterLevel, ExecutionStatus, ProgrammingLanguage } from '../enums.ts'
import type { IsoDateTime, JsonValue } from './envelope.ts'

export interface TrackRef {
  readonly slug: string
  readonly name: string
}

export interface TrackSummary {
  readonly slug: string
  readonly name: string
  readonly summary: string
  readonly programmingLanguage: ProgrammingLanguage | null
  readonly prerequisite: TrackRef | null
}

export interface LessonHeading {
  readonly id: string
  readonly text: string
}

export interface TrackViewLesson {
  readonly slug: string
  readonly title: string
  readonly summary: string
  readonly headings: readonly LessonHeading[]
}

export interface TrackViewExercise {
  readonly slug: string
  readonly title: string
  readonly instructions: string
}

export interface TrackViewChapter {
  readonly slug: string
  readonly title: string
  readonly summary: string
  readonly level: ChapterLevel
  readonly number: number
  readonly lessons: readonly TrackViewLesson[]
  readonly exercises: readonly TrackViewExercise[]
}

export interface TrackView {
  readonly track: TrackSummary
  readonly chapters: readonly TrackViewChapter[]
}

export interface ContentTrackRef {
  readonly slug: string
  readonly name: string
  readonly programmingLanguage: ProgrammingLanguage | null
}

export interface ContentChapterRef {
  readonly slug: string
  readonly title: string
  readonly number: number
}

export interface LessonDetail {
  readonly slug: string
  readonly title: string
  readonly summary: string
  readonly body: string
  readonly lastReviewedAt: IsoDateTime | null
  readonly number: number
  readonly track: ContentTrackRef
  readonly chapter: ContentChapterRef
}

export interface PublicTestCase {
  readonly arguments: readonly JsonValue[]
  readonly expectedResult: JsonValue
  readonly description: string | null
}

export interface ExerciseLink {
  readonly chapter: string
  readonly slug: string
}

export interface PublicExercise {
  readonly slug: string
  readonly title: string
  readonly number: number
  readonly instructions: string
  readonly functionName: string
  readonly starterCode: string
  readonly hints: readonly string[]
  readonly testCases: readonly PublicTestCase[]
  readonly hiddenTestCaseCount: number
  readonly track: ContentTrackRef
  readonly chapter: ContentChapterRef
  readonly next: ExerciseLink | null
}

export interface ExerciseRef {
  readonly track: string
  readonly chapter: string
  readonly slug: string
}

export interface ExecutionRequest {
  readonly code: string
  readonly programmingLanguage?: ProgrammingLanguage
  readonly exercise?: ExerciseRef
}

export interface ExecutionRun {
  readonly stdout: string
  readonly stderr: string
  readonly output: string
  readonly code: number | null
  readonly signal: string | null
  readonly wall_time: number | null
}

export interface ExecutionResult {
  readonly status: ExecutionStatus
  readonly label: string
  readonly run: ExecutionRun
}

export interface VerificationRequest {
  readonly code: string
}

export interface VerificationCheck {
  readonly label: string
  readonly passed: boolean
  readonly detail: string | null
  readonly caseIndex: number | null
  readonly actual: JsonValue | null
}

export interface VerificationResult {
  readonly passed: boolean
  readonly passedCount: number
  readonly total: number
  readonly checks: readonly VerificationCheck[]
  readonly execution: ExecutionResult
}
