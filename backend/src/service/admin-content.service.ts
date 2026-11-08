import { randomUUID } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'

import type { ProgrammingLanguage } from '@scalar/shared/enums'
import { CHAPTER_LEVELS, PROGRAMMING_LANGUAGES, PUBLICATION_STATUSES } from '@scalar/shared/enums'
import {
  MAX_CASE_JSON_BYTES,
  MAX_EXERCISE_CODE_LENGTH,
  MAX_EXERCISE_INSTRUCTIONS_LENGTH,
  MAX_EXERCISE_TITLE_LENGTH,
  MAX_FUNCTION_NAME_LENGTH,
  MAX_HINT_LENGTH,
  MAX_HINTS,
  MAX_TEST_CASE_DESCRIPTION_LENGTH,
  MAX_TEST_CASES,
} from '@scalar/shared/limits'
import { z } from 'zod'

import { FUNCTION_NAME_PATTERN, MESSAGES, SLUG_PATTERN } from '../constants.ts'
import type { AdminExercise } from '../entity/admin-exercise.entity.ts'
import type { Chapter } from '../entity/chapter.entity.ts'
import type { Track } from '../entity/track.entity.ts'
import type {
  AdminContentRepository,
  DeleteOutcome,
  ExerciseChanges,
  ExerciseInput,
} from '../repository/admin-content.repository.ts'
import type { ExecutionResult } from './execution.service.ts'
import { executeCode, toJavaScript } from './execution.service.ts'
import type { VerificationCheck } from './verification.service.ts'
import { buildHarness, readVerdict } from './verification.service.ts'

export type Refusal =
  | 'not-found'
  | 'slug-taken'
  | 'slug-locked'
  | 'prerequisite-not-found'
  | 'own-prerequisite'
  | 'published-once'
  | 'in-use'
  | 'exercise-locked'
  | 'solution-not-checked'
  | 'no-language'
  | 'no-test-cases'
  | 'check-outdated'

export interface SolutionCheck {
  readonly exercise: AdminExercise
  readonly passed: boolean
  readonly checks: readonly VerificationCheck[]
  readonly stderr: string
}

export type AdminOutcome<T> =
  | { readonly status: 'saved'; readonly item: T }
  | { readonly status: 'deleted' }
  | { readonly status: 'invalid'; readonly error: string }
  | { readonly status: Refusal }

const slug = z.string().regex(SLUG_PATTERN).max(64)
const text = (max: number) => z.string().trim().min(1).max(max)
const status = z.enum(PUBLICATION_STATUSES)

const trackFields = {
  slug,
  name: text(100),
  summary: text(500),
  programmingLanguage: z.enum(PROGRAMMING_LANGUAGES).nullable(),
  prerequisiteTrackId: z.int().positive().nullable(),
}
// Strict : une faute de frappe dans un nom de champ est refusee, pas ignoree en silence.
const newTrack = z.strictObject({
  ...trackFields,
  programmingLanguage: trackFields.programmingLanguage.default(null),
  prerequisiteTrackId: trackFields.prerequisiteTrackId.default(null),
})
const trackChanges = z.strictObject(trackFields).partial().extend({ status: status.optional() })

const chapterFields = {
  slug,
  level: z.enum(CHAPTER_LEVELS),
  title: text(100),
  summary: text(500),
}
const newChapter = z.strictObject(chapterFields)
const chapterChanges = z.strictObject(chapterFields).partial().extend({ status: status.optional() })

const code = z
  .string()
  .max(MAX_EXERCISE_CODE_LENGTH)
  .refine((source) => source.trim() !== '')
const caseJson = <T extends z.ZodType>(schema: T) =>
  schema.refine((value) => Buffer.byteLength(JSON.stringify(value)) <= MAX_CASE_JSON_BYTES)

const testCase = z.strictObject({
  arguments: caseJson(z.array(z.json())),
  expectedResult: caseJson(z.json()),
  isHidden: z.boolean().default(false),
  description: text(MAX_TEST_CASE_DESCRIPTION_LENGTH).nullable().default(null),
})

const exerciseFields = {
  slug,
  title: text(MAX_EXERCISE_TITLE_LENGTH),
  instructions: text(MAX_EXERCISE_INSTRUCTIONS_LENGTH),
  functionName: z.string().regex(FUNCTION_NAME_PATTERN).max(MAX_FUNCTION_NAME_LENGTH),
  starterCode: code,
  solutionCode: code,
  hints: z.array(text(MAX_HINT_LENGTH)).max(MAX_HINTS),
  testCases: z.array(testCase).max(MAX_TEST_CASES),
}
const newExercise = z.strictObject({
  ...exerciseFields,
  hints: exerciseFields.hints.default([]),
  testCases: exerciseFields.testCases.default([]),
})
const exerciseChanges = z
  .strictObject(exerciseFields)
  .partial()
  .extend({ status: status.optional() })

type Parsed<T> =
  { ok: true; data: T } | { ok: false; outcome: { status: 'invalid'; error: string } }

function parse<T>(schema: z.ZodType<T>, body: unknown): Parsed<T> {
  const parsed = schema.safeParse(body ?? {})
  if (parsed.success) {
    return { ok: true, data: parsed.data }
  }
  const issue = parsed.error.issues[0]
  const field = issue?.code === 'unrecognized_keys' ? issue.keys.join(', ') : issue?.path.join('.')
  const error = field ? `${MESSAGES.invalidField} ${field}.` : MESSAGES.invalidRequest
  return { ok: false, outcome: { status: 'invalid', error } }
}

const fromDelete = (outcome: DeleteOutcome): AdminOutcome<never> =>
  outcome === 'deleted' ? { status: 'deleted' } : { status: outcome }

interface Published {
  readonly slug: string
  readonly firstPublishedAt: Date | null
}

/** Refus commun : slug fige une fois publie. Sinon, date de premiere publication a poser. */
function publication(
  current: Published,
  changes: { slug?: string; status?: string },
  now: Date,
): { refusal: 'slug-locked' } | { firstPublishedAt?: Date } {
  if (changes.slug !== undefined && changes.slug !== current.slug && current.firstPublishedAt) {
    return { refusal: 'slug-locked' }
  }
  return changes.status === 'published' && !current.firstPublishedAt
    ? { firstPublishedAt: now }
    : {}
}

/** Vrai si ce que la verification a valide change : champs de code ou cas de test. */
function changesCheckedContent(current: AdminExercise, changes: ExerciseChanges): boolean {
  const fields = ['functionName', 'starterCode', 'solutionCode'] as const
  if (fields.some((f) => changes[f] !== undefined && changes[f] !== current[f])) {
    return true
  }
  const currentCases = current.testCases.map((t) => ({
    arguments: t.arguments,
    expectedResult: t.expectedResult,
    isHidden: t.isHidden,
    description: t.description,
  }))
  return changes.testCases !== undefined && !isDeepStrictEqual(changes.testCases, currentCases)
}

export class AdminContentService {
  private readonly content: AdminContentRepository
  private readonly now: () => Date
  private readonly execute: (code: string) => Promise<ExecutionResult>

  constructor(
    content: AdminContentRepository,
    now: () => Date = () => new Date(),
    execute: (code: string) => Promise<ExecutionResult> = executeCode,
  ) {
    this.content = content
    this.now = now
    this.execute = execute
  }

  listTracks(): Promise<readonly Track[]> {
    return this.content.listTracks()
  }

  findTrack(id: number): Promise<Track | null> {
    return this.content.findTrack(id)
  }

  async createTrack(body: unknown): Promise<AdminOutcome<Track>> {
    const parsed = parse(newTrack, body)
    return parsed.ok ? this.content.createTrack(parsed.data) : parsed.outcome
  }

  async updateTrack(id: number, body: unknown): Promise<AdminOutcome<Track>> {
    const parsed = parse(trackChanges, body)
    if (!parsed.ok) {
      return parsed.outcome
    }
    const current = await this.content.findTrack(id)
    if (!current) {
      return { status: 'not-found' }
    }
    if (parsed.data.prerequisiteTrackId === id) {
      return { status: 'own-prerequisite' }
    }
    const published = publication(current, parsed.data, this.now())
    if ('refusal' in published) {
      return { status: published.refusal }
    }
    return this.content.updateTrack(id, { ...parsed.data, ...published })
  }

  async deleteTrack(id: number): Promise<AdminOutcome<never>> {
    const current = await this.content.findTrack(id)
    if (current?.firstPublishedAt) {
      return { status: 'published-once' }
    }
    return fromDelete(await this.content.deleteTrack(id))
  }

  async listChapters(trackId: number): Promise<readonly Chapter[] | null> {
    return (await this.content.findTrack(trackId)) ? this.content.listChapters(trackId) : null
  }

  findChapter(trackId: number, id: number): Promise<Chapter | null> {
    return this.content.findChapter(trackId, id)
  }

  async createChapter(trackId: number, body: unknown): Promise<AdminOutcome<Chapter>> {
    const parsed = parse(newChapter, body)
    return parsed.ok ? this.content.createChapter(trackId, parsed.data) : parsed.outcome
  }

  async updateChapter(trackId: number, id: number, body: unknown): Promise<AdminOutcome<Chapter>> {
    const parsed = parse(chapterChanges, body)
    if (!parsed.ok) {
      return parsed.outcome
    }
    const current = await this.content.findChapter(trackId, id)
    if (!current) {
      return { status: 'not-found' }
    }
    const published = publication(current, parsed.data, this.now())
    if ('refusal' in published) {
      return { status: published.refusal }
    }
    return this.content.updateChapter(trackId, id, { ...parsed.data, ...published })
  }

  async deleteChapter(trackId: number, id: number): Promise<AdminOutcome<never>> {
    const current = await this.content.findChapter(trackId, id)
    if (current?.firstPublishedAt) {
      return { status: 'published-once' }
    }
    return fromDelete(await this.content.deleteChapter(trackId, id))
  }

  async listExercises(chapterId: number): Promise<readonly AdminExercise[] | null> {
    return (await this.content.findChapterById(chapterId))
      ? this.content.listExercises(chapterId)
      : null
  }

  findExercise(id: number): Promise<AdminExercise | null> {
    return this.content.findExercise(id)
  }

  async createExercise(chapterId: number, body: unknown): Promise<AdminOutcome<AdminExercise>> {
    const parsed = parse<ExerciseInput>(newExercise, body)
    if (!parsed.ok) {
      return parsed.outcome
    }
    const chapter = await this.content.findChapterById(chapterId)
    if (!chapter) {
      return { status: 'not-found' }
    }
    if (!(await this.languageOf(chapter.id))) {
      return { status: 'no-language' }
    }
    return this.content.createExercise(chapterId, parsed.data)
  }

  async updateExercise(id: number, body: unknown): Promise<AdminOutcome<AdminExercise>> {
    const parsed = parse<ExerciseChanges>(exerciseChanges, body)
    if (!parsed.ok) {
      return parsed.outcome
    }
    const current = await this.content.findExercise(id)
    if (!current) {
      return { status: 'not-found' }
    }
    const changes = parsed.data
    const touched = changesCheckedContent(current, changes)
    const wasPublished = current.status === 'published'
    if (touched && wasPublished && (changes.status ?? current.status) === 'published') {
      return { status: 'exercise-locked' }
    }
    // Seulement au passage en publie : un exercice deja en ligne reste corrigeable (titre, indices).
    if (
      changes.status === 'published' &&
      !wasPublished &&
      (touched || current.solutionCheckStatus !== 'passed')
    ) {
      return { status: 'solution-not-checked' }
    }
    const published = publication(current, changes, this.now())
    if ('refusal' in published) {
      return { status: published.refusal }
    }
    return this.content.updateExercise(id, {
      ...changes,
      ...published,
      ...(touched && { solutionCheckStatus: 'not_checked', solutionCheckedAt: null }),
    })
  }

  async deleteExercise(id: number): Promise<AdminOutcome<never>> {
    const current = await this.content.findExercise(id)
    if (current?.firstPublishedAt) {
      return { status: 'published-once' }
    }
    return fromDelete(await this.content.deleteExercise(id))
  }

  async checkSolution(id: number): Promise<AdminOutcome<SolutionCheck>> {
    const exercise = await this.content.findExercise(id)
    if (!exercise) {
      return { status: 'not-found' }
    }
    if (exercise.testCases.length === 0) {
      return { status: 'no-test-cases' }
    }
    const language = await this.languageOf(exercise.chapterId)
    if (!language) {
      return { status: 'no-language' }
    }
    const verdict = await this.runSolution(exercise, language)
    const checked = await this.content.recordSolutionCheck(
      exercise,
      verdict.passed ? 'passed' : 'failed',
      this.now(),
    )
    return checked
      ? { status: 'saved', item: { ...verdict, exercise: checked } }
      : { status: 'check-outdated' }
  }

  private async languageOf(chapterId: number): Promise<ProgrammingLanguage | null> {
    const chapter = await this.content.findChapterById(chapterId)
    const track = chapter && (await this.content.findTrack(chapter.trackId))
    return track?.programmingLanguage ?? null
  }

  private async runSolution(
    exercise: AdminExercise,
    language: ProgrammingLanguage,
  ): Promise<Omit<SolutionCheck, 'exercise'>> {
    const converted = toJavaScript(language, exercise.solutionCode)
    if (!converted.ok) {
      const check = { label: 'Le programme s’exécute', passed: false, detail: converted.error }
      return { passed: false, checks: [check], stderr: '' }
    }
    // Rien de cache pour un admin : le verdict detaille aussi les cas caches.
    const cases = exercise.testCases.map((t) => ({ ...t, isHidden: false }))
    const marker = `__scalar_${randomUUID()}__`
    const harness = buildHarness(converted.code, exercise.functionName, cases, marker)
    const execution = await this.execute(harness)
    const { passed, checks } = readVerdict(execution, exercise.functionName, cases, marker)
    return { passed, checks, stderr: execution.run.stderr }
  }
}
