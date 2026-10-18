/**
 * Lecture des exercices d'un parcours.
 *
 * Tout ce qui sort d'ici est destine au navigateur : la solution d'un exercice
 * et ses cas de test caches n'y figurent jamais.
 */

import type { Chapter, Exercise, ProgrammingLanguage, Track } from '../db/schema.ts'
import type { ExerciseRepository } from '../repositories/exercise.repository.ts'
import type { TrackRepository } from '../repositories/track.repository.ts'
import type { TrackLink } from './track.service.ts'
import { rank, toTrackLink } from './track.service.ts'
import type { VerificationCase } from './verification.service.ts'

export interface TestCaseView {
  readonly arguments: readonly unknown[]
  readonly expectedResult: unknown
  readonly description: string | null
}

export interface PublicExercise {
  readonly slug: string
  readonly title: string
  /** Rang dans le chapitre : l'exercice 1.2 a le numero 2. */
  readonly number: number
  readonly instructions: string
  readonly functionName: string
  readonly starterCode: string
  readonly hints: readonly string[]
  /** Cas visibles seulement. */
  readonly testCases: readonly TestCaseView[]
  /** `programmingLanguage` dit au navigateur ce que l'execution verifie : les types, ou non. */
  readonly track: TrackLink & { readonly programmingLanguage: ProgrammingLanguage }
  readonly chapter: { readonly slug: string; readonly title: string; readonly number: number }
  /** Exercice suggere ensuite : suivant du chapitre, sinon premier d'un chapitre suivant. */
  readonly next: { readonly chapterSlug: string; readonly slug: string } | null
}

export interface ExerciseToVerify {
  readonly functionName: string
  readonly programmingLanguage: ProgrammingLanguage
  readonly cases: readonly VerificationCase[]
}

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

  /**
   * Ce que la correction doit connaitre d'un exercice, cas caches compris.
   * Reste cote serveur : n'est jamais renvoye tel quel au navigateur.
   */
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

  /** L'exercice a son adresse complete, parents publies ; null sinon. */
  private async locate(
    trackSlug: string,
    chapterSlug: string,
    exerciseSlug: string,
  ): Promise<Located | null> {
    const track = await this.tracks.findTrackBySlug(trackSlug)
    // Un parcours sans langage n'a pas d'exercice.
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

    // Un chapitre sans exercice est saute : on suggere le premier exercice qui existe.
    for (const next of chapters.slice(rank(chapters, chapter))) {
      const [first] = await this.exercises.listExercises(next.id)
      if (first) {
        return { chapterSlug: next.slug, slug: first.slug }
      }
    }
    return null
  }
}
