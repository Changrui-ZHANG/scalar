// Sortie destinee au navigateur : jamais la solution ni les cas caches.

import { randomUUID } from 'node:crypto'

import type { Chapter, Exercise, ProgrammingLanguage, Track } from '../database/types.ts'
import type { ExerciseRepository } from '../repository/exercise.repository.ts'
import type { TrackRepository } from '../repository/track.repository.ts'
import { executeCode, toJavaScript } from './execution.service.ts'
import type { TrackLink } from './track.service.ts'
import { rank, toTrackLink } from './track.service.ts'
import type { VerificationCase, VerificationResult } from './verification.service.ts'
import { buildHarness, readVerdict } from './verification.service.ts'

export interface TestCaseView {
  readonly arguments: readonly unknown[]
  readonly expectedResult: unknown
  readonly description: string | null
}

export interface PublicExercise {
  readonly slug: string
  readonly title: string
  readonly number: number
  readonly instructions: string
  readonly functionName: string
  readonly starterCode: string
  readonly hints: readonly string[]
  readonly testCases: readonly TestCaseView[]
  readonly track: TrackLink & { readonly programmingLanguage: ProgrammingLanguage }
  readonly chapter: { readonly slug: string; readonly title: string; readonly number: number }
  readonly next: { readonly chapterSlug: string; readonly slug: string } | null
}

export interface ExerciseToVerify {
  readonly functionName: string
  readonly programmingLanguage: ProgrammingLanguage
  readonly cases: readonly VerificationCase[]
}

export type Verification =
  | { readonly ok: true; readonly result: VerificationResult }
  | { readonly ok: false; readonly error: string }

interface Located {
  readonly track: Track
  readonly programmingLanguage: ProgrammingLanguage
  readonly chapter: Chapter
  readonly exercise: Exercise
}

// La contrainte `arguments` tableau JSON est tenue par la base.
const toArguments = (value: unknown): readonly unknown[] => value as unknown[]

export class ExerciseService {
  private readonly tracks: TrackRepository
  private readonly exercises: ExerciseRepository

  constructor(tracks: TrackRepository, exercises: ExerciseRepository) {
    this.tracks = tracks
    this.exercises = exercises
  }

  async getExercise(
    trackSlug: string,
    chapterSlug: string,
    exerciseSlug: string,
  ): Promise<PublicExercise | null> {
    const located = await this.locate(trackSlug, chapterSlug, exerciseSlug)
    if (!located) {
      return null
    }
    const { track, programmingLanguage, chapter, exercise } = located
    const chapters = await this.tracks.listChapters(track.id)
    const siblings = await this.exercises.listExercises(chapter.id)
    const testCases = await this.exercises.listTestCases(exercise.id)

    return {
      slug: exercise.slug,
      title: exercise.title,
      number: rank(siblings, exercise),
      instructions: exercise.instructions,
      functionName: exercise.functionName,
      starterCode: exercise.starterCode,
      hints: exercise.hints,
      testCases: testCases
        .filter((t) => !t.isHidden)
        .map((t) => ({
          arguments: toArguments(t.arguments),
          expectedResult: t.expectedResult,
          description: t.description,
        })),
      track: { ...toTrackLink(track), programmingLanguage },
      chapter: { slug: chapter.slug, title: chapter.title, number: rank(chapters, chapter) },
      next: await this.findNext(exercise, siblings, chapter, chapters),
    }
  }

  async findForVerification(
    trackSlug: string,
    chapterSlug: string,
    exerciseSlug: string,
  ): Promise<ExerciseToVerify | null> {
    const located = await this.locate(trackSlug, chapterSlug, exerciseSlug)
    if (!located) {
      return null
    }
    const testCases = await this.exercises.listTestCases(located.exercise.id)
    return {
      functionName: located.exercise.functionName,
      programmingLanguage: located.programmingLanguage,
      cases: testCases.map((t) => ({
        arguments: toArguments(t.arguments),
        expectedResult: t.expectedResult,
        description: t.description,
        isHidden: t.isHidden,
      })),
    }
  }

  async verify(
    trackSlug: string,
    chapterSlug: string,
    exerciseSlug: string,
    code: string,
  ): Promise<Verification | null> {
    const target = await this.findForVerification(trackSlug, chapterSlug, exerciseSlug)
    if (!target) {
      return null
    }
    const converted = toJavaScript(target.programmingLanguage, code)
    if (!converted.ok) {
      return converted
    }
    const marker = `__scalar_${randomUUID()}__`
    const harness = buildHarness(converted.code, target.functionName, target.cases, marker)
    const execution = await executeCode(harness)
    return { ok: true, result: readVerdict(execution, target.functionName, target.cases, marker) }
  }

  private async locate(
    trackSlug: string,
    chapterSlug: string,
    exerciseSlug: string,
  ): Promise<Located | null> {
    const track = await this.tracks.findTrackBySlug(trackSlug)
    const programmingLanguage = track?.programmingLanguage
    if (!track || !programmingLanguage) {
      return null
    }
    const chapter = await this.tracks.findChapter(track.id, chapterSlug)
    const exercise = chapter && (await this.exercises.findExercise(chapter.id, exerciseSlug))
    if (!chapter || !exercise) {
      return null
    }
    return { track, programmingLanguage, chapter, exercise }
  }

  private async findNext(
    exercise: Exercise,
    siblings: readonly Exercise[],
    chapter: Chapter,
    chapters: readonly Chapter[],
  ): Promise<PublicExercise['next']> {
    const nextInChapter = siblings[rank(siblings, exercise)]
    if (nextInChapter) {
      return { chapterSlug: chapter.slug, slug: nextInChapter.slug }
    }

    for (const next of chapters.slice(rank(chapters, chapter))) {
      const [first] = await this.exercises.listExercises(next.id)
      if (first) {
        return { chapterSlug: next.slug, slug: first.slug }
      }
    }
    return null
  }
}
