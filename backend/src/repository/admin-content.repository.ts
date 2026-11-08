import type { JsonValue } from '@scalar/shared/api'
import type {
  ChapterLevel,
  ProgrammingLanguage,
  PublicationStatus,
  SolutionCheckStatus,
} from '@scalar/shared/enums'

import { CHAPTER_LEVELS } from '../constants.ts'
import type { AdminExercise } from '../entity/admin-exercise.entity.ts'
import type { Chapter } from '../entity/chapter.entity.ts'
import type { Exercise } from '../entity/exercise.entity.ts'
import type { ExerciseTestCase } from '../entity/exercise-test-case.entity.ts'
import type { Track } from '../entity/track.entity.ts'
import { CHAPTERS } from '../content/chapters.ts'
import { EXERCISES, EXERCISE_TEST_CASES } from '../content/exercises.ts'
import { LESSONS } from '../content/lessons.ts'
import { TRACKS } from '../content/tracks.ts'

export interface TrackInput {
  readonly slug: string
  readonly name: string
  readonly summary: string
  readonly programmingLanguage: ProgrammingLanguage | null
  readonly prerequisiteTrackId: number | null
}

export interface TrackChanges extends Partial<TrackInput> {
  readonly status?: PublicationStatus
  readonly firstPublishedAt?: Date
}

export interface ChapterInput {
  readonly slug: string
  readonly level: ChapterLevel
  readonly title: string
  readonly summary: string
}

export interface ChapterChanges extends Partial<ChapterInput> {
  readonly status?: PublicationStatus
  readonly firstPublishedAt?: Date
}

export interface TestCaseInput {
  readonly arguments: readonly JsonValue[]
  readonly expectedResult: JsonValue
  readonly isHidden: boolean
  readonly description: string | null
}

export interface ExerciseInput {
  readonly slug: string
  readonly title: string
  readonly instructions: string
  readonly functionName: string
  readonly starterCode: string
  readonly solutionCode: string
  readonly hints: string[]
  /** L'ordre de la liste donne les positions. */
  readonly testCases: readonly TestCaseInput[]
}

export interface ExerciseChanges extends Partial<ExerciseInput> {
  readonly status?: PublicationStatus
  readonly firstPublishedAt?: Date
  readonly solutionCheckStatus?: SolutionCheckStatus
  readonly solutionCheckedAt?: Date | null
}

export type SaveOutcome<T> =
  | { readonly status: 'saved'; readonly item: T }
  /** L'element, ou pour une creation de chapitre son parcours. */
  | { readonly status: 'not-found' }
  | { readonly status: 'slug-taken' }
  | { readonly status: 'prerequisite-not-found' }

/** `in-use` : du contenu, un certificat ou un positionnement en depend encore. */
export type DeleteOutcome = 'deleted' | 'not-found' | 'in-use'

/** Tout le contenu, brouillons compris : jamais monte hors de `/api/v1/admin`. */
export interface AdminContentRepository {
  listTracks(): Promise<readonly Track[]>
  findTrack(id: number): Promise<Track | null>
  /** Toujours en brouillon, place apres les parcours existants. */
  createTrack(input: TrackInput): Promise<SaveOutcome<Track>>
  updateTrack(id: number, changes: TrackChanges): Promise<SaveOutcome<Track>>
  deleteTrack(id: number): Promise<DeleteOutcome>
  listChapters(trackId: number): Promise<readonly Chapter[]>
  findChapter(trackId: number, id: number): Promise<Chapter | null>
  /** Toujours en brouillon, place a la fin de son niveau. */
  createChapter(trackId: number, input: ChapterInput): Promise<SaveOutcome<Chapter>>
  /** Un changement de niveau replace le chapitre a la fin de son nouveau niveau. */
  updateChapter(trackId: number, id: number, changes: ChapterChanges): Promise<SaveOutcome<Chapter>>
  deleteChapter(trackId: number, id: number): Promise<DeleteOutcome>
  findChapterById(id: number): Promise<Chapter | null>
  listExercises(chapterId: number): Promise<readonly AdminExercise[]>
  findExercise(id: number): Promise<AdminExercise | null>
  /** Toujours en brouillon et non verifie, place a la fin du chapitre. */
  createExercise(chapterId: number, input: ExerciseInput): Promise<SaveOutcome<AdminExercise>>
  /** `testCases`, si present, remplace toute la liste. */
  updateExercise(id: number, changes: ExerciseChanges): Promise<SaveOutcome<AdminExercise>>
  deleteExercise(id: number): Promise<DeleteOutcome>
  /** Null si l'exercice a change depuis `checked` : le verdict ne vaut plus pour lui. */
  recordSolutionCheck(
    checked: Exercise,
    result: SolutionCheckStatus,
    at: Date,
  ): Promise<AdminExercise | null>
}

const byPosition = (a: { position: number }, b: { position: number }): number =>
  a.position - b.position

const byLevelThenPosition = (a: Chapter, b: Chapter): number =>
  CHAPTER_LEVELS.indexOf(a.level) - CHAPTER_LEVELS.indexOf(b.level) || byPosition(a, b)

const nextPosition = (rows: readonly { position: number }[]): number =>
  Math.max(0, ...rows.map((r) => r.position)) + 1

const nextId = (rows: readonly { id: number }[]): number =>
  Math.max(0, ...rows.map((r) => r.id)) + 1

/** Les lecons ne servent qu'a refuser la suppression d'un chapitre qui en a. */
export class InMemoryAdminContentRepository implements AdminContentRepository {
  private tracks: Track[]
  private chapters: Chapter[]
  private exercises: Exercise[]
  private testCases: ExerciseTestCase[]
  private readonly chapterIdsWithLessons: ReadonlySet<number>

  constructor(
    tracks: readonly Track[] = TRACKS,
    chapters: readonly Chapter[] = CHAPTERS,
    lessons: readonly { chapterId: number }[] = LESSONS,
    exercises: readonly Exercise[] = EXERCISES,
    testCases: readonly ExerciseTestCase[] = EXERCISE_TEST_CASES,
  ) {
    this.tracks = tracks.map((t) => ({ ...t }))
    this.chapters = chapters.map((c) => ({ ...c }))
    this.exercises = exercises.map((e) => ({ ...e }))
    this.testCases = testCases.map((t) => ({ ...t }))
    this.chapterIdsWithLessons = new Set(lessons.map((l) => l.chapterId))
  }

  async listTracks(): Promise<readonly Track[]> {
    return this.tracks.toSorted(byPosition).map((t) => ({ ...t }))
  }

  async findTrack(id: number): Promise<Track | null> {
    const track = this.tracks.find((t) => t.id === id)
    return track ? { ...track } : null
  }

  async createTrack(input: TrackInput): Promise<SaveOutcome<Track>> {
    const refusal = this.checkTrack(null, input)
    if (refusal) {
      return refusal
    }
    const now = new Date()
    const track: Track = {
      ...input,
      id: nextId(this.tracks),
      position: nextPosition(this.tracks),
      status: 'draft',
      firstPublishedAt: null,
      createdAt: now,
      updatedAt: now,
    }
    this.tracks.push(track)
    return { status: 'saved', item: { ...track } }
  }

  async updateTrack(id: number, changes: TrackChanges): Promise<SaveOutcome<Track>> {
    const track = this.tracks.find((t) => t.id === id)
    if (!track) {
      return { status: 'not-found' }
    }
    const refusal = this.checkTrack(id, changes)
    if (refusal) {
      return refusal
    }
    Object.assign(track, changes, { updatedAt: new Date() })
    return { status: 'saved', item: { ...track } }
  }

  async deleteTrack(id: number): Promise<DeleteOutcome> {
    if (!this.tracks.some((t) => t.id === id)) {
      return 'not-found'
    }
    if (this.chapters.some((c) => c.trackId === id)) {
      return 'in-use'
    }
    this.tracks = this.tracks
      .filter((t) => t.id !== id)
      .map((t) => (t.prerequisiteTrackId === id ? { ...t, prerequisiteTrackId: null } : t))
    return 'deleted'
  }

  async listChapters(trackId: number): Promise<readonly Chapter[]> {
    return this.chapters
      .filter((c) => c.trackId === trackId)
      .toSorted(byLevelThenPosition)
      .map((c) => ({ ...c }))
  }

  async findChapter(trackId: number, id: number): Promise<Chapter | null> {
    const chapter = this.chapters.find((c) => c.trackId === trackId && c.id === id)
    return chapter ? { ...chapter } : null
  }

  async createChapter(trackId: number, input: ChapterInput): Promise<SaveOutcome<Chapter>> {
    if (!this.tracks.some((t) => t.id === trackId)) {
      return { status: 'not-found' }
    }
    if (this.slugTakenInTrack(trackId, null, input.slug)) {
      return { status: 'slug-taken' }
    }
    const now = new Date()
    const chapter: Chapter = {
      ...input,
      id: nextId(this.chapters),
      trackId,
      position: this.nextChapterPosition(trackId, input.level),
      status: 'draft',
      firstPublishedAt: null,
      createdAt: now,
      updatedAt: now,
    }
    this.chapters.push(chapter)
    return { status: 'saved', item: { ...chapter } }
  }

  async updateChapter(
    trackId: number,
    id: number,
    changes: ChapterChanges,
  ): Promise<SaveOutcome<Chapter>> {
    const chapter = this.chapters.find((c) => c.trackId === trackId && c.id === id)
    if (!chapter) {
      return { status: 'not-found' }
    }
    if (changes.slug !== undefined && this.slugTakenInTrack(trackId, id, changes.slug)) {
      return { status: 'slug-taken' }
    }
    const moved = changes.level !== undefined && changes.level !== chapter.level
    const position = moved ? this.nextChapterPosition(trackId, changes.level!) : chapter.position
    Object.assign(chapter, changes, { position, updatedAt: new Date() })
    return { status: 'saved', item: { ...chapter } }
  }

  async deleteChapter(trackId: number, id: number): Promise<DeleteOutcome> {
    if (!this.chapters.some((c) => c.trackId === trackId && c.id === id)) {
      return 'not-found'
    }
    if (this.chapterIdsWithLessons.has(id) || this.exercises.some((e) => e.chapterId === id)) {
      return 'in-use'
    }
    this.chapters = this.chapters.filter((c) => c.id !== id)
    return 'deleted'
  }

  async findChapterById(id: number): Promise<Chapter | null> {
    const chapter = this.chapters.find((c) => c.id === id)
    return chapter ? { ...chapter } : null
  }

  async listExercises(chapterId: number): Promise<readonly AdminExercise[]> {
    return this.exercises
      .filter((e) => e.chapterId === chapterId)
      .toSorted(byPosition)
      .map((e) => this.withTestCases(e))
  }

  async findExercise(id: number): Promise<AdminExercise | null> {
    const exercise = this.exercises.find((e) => e.id === id)
    return exercise ? this.withTestCases(exercise) : null
  }

  async createExercise(
    chapterId: number,
    { testCases, ...input }: ExerciseInput,
  ): Promise<SaveOutcome<AdminExercise>> {
    if (!this.chapters.some((c) => c.id === chapterId)) {
      return { status: 'not-found' }
    }
    if (this.exerciseSlugTaken(chapterId, null, input.slug)) {
      return { status: 'slug-taken' }
    }
    const now = new Date()
    const exercise: Exercise = {
      ...input,
      id: nextId(this.exercises),
      chapterId,
      position: nextPosition(this.exercises.filter((e) => e.chapterId === chapterId)),
      solutionCheckStatus: 'not_checked',
      solutionCheckedAt: null,
      status: 'draft',
      firstPublishedAt: null,
      createdAt: now,
      updatedAt: now,
    }
    this.exercises.push(exercise)
    this.replaceTestCases(exercise.id, testCases)
    return { status: 'saved', item: this.withTestCases(exercise) }
  }

  async updateExercise(
    id: number,
    { testCases, ...changes }: ExerciseChanges,
  ): Promise<SaveOutcome<AdminExercise>> {
    const exercise = this.exercises.find((e) => e.id === id)
    if (!exercise) {
      return { status: 'not-found' }
    }
    if (
      changes.slug !== undefined &&
      this.exerciseSlugTaken(exercise.chapterId, id, changes.slug)
    ) {
      return { status: 'slug-taken' }
    }
    Object.assign(exercise, changes, { updatedAt: new Date() })
    if (testCases) {
      this.replaceTestCases(id, testCases)
    }
    return { status: 'saved', item: this.withTestCases(exercise) }
  }

  async deleteExercise(id: number): Promise<DeleteOutcome> {
    if (!this.exercises.some((e) => e.id === id)) {
      return 'not-found'
    }
    this.exercises = this.exercises.filter((e) => e.id !== id)
    this.testCases = this.testCases.filter((t) => t.exerciseId !== id)
    return 'deleted'
  }

  async recordSolutionCheck(
    checked: Exercise,
    result: SolutionCheckStatus,
    at: Date,
  ): Promise<AdminExercise | null> {
    const exercise = this.exercises.find((e) => e.id === checked.id)
    if (exercise?.updatedAt.getTime() !== checked.updatedAt.getTime()) {
      return null
    }
    Object.assign(exercise, {
      solutionCheckStatus: result,
      solutionCheckedAt: at,
      updatedAt: new Date(),
    })
    return this.withTestCases(exercise)
  }

  private withTestCases(exercise: Exercise): AdminExercise {
    return {
      ...exercise,
      testCases: this.testCases
        .filter((t) => t.exerciseId === exercise.id)
        .toSorted(byPosition)
        .map((t) => ({ ...t })),
    }
  }

  private replaceTestCases(exerciseId: number, cases: readonly TestCaseInput[]): void {
    const now = new Date()
    const firstId = nextId(this.testCases)
    this.testCases = [
      ...this.testCases.filter((t) => t.exerciseId !== exerciseId),
      ...cases.map((c, index) => ({
        ...c,
        id: firstId + index,
        exerciseId,
        position: index + 1,
        createdAt: now,
        updatedAt: now,
      })),
    ]
  }

  private exerciseSlugTaken(chapterId: number, id: number | null, slug: string): boolean {
    return this.exercises.some((e) => e.chapterId === chapterId && e.slug === slug && e.id !== id)
  }

  private checkTrack(
    id: number | null,
    { slug, prerequisiteTrackId }: Partial<TrackInput>,
  ): SaveOutcome<Track> | null {
    if (slug !== undefined && this.tracks.some((t) => t.slug === slug && t.id !== id)) {
      return { status: 'slug-taken' }
    }
    if (
      prerequisiteTrackId !== undefined &&
      prerequisiteTrackId !== null &&
      !this.tracks.some((t) => t.id === prerequisiteTrackId)
    ) {
      return { status: 'prerequisite-not-found' }
    }
    return null
  }

  private slugTakenInTrack(trackId: number, id: number | null, slug: string): boolean {
    return this.chapters.some((c) => c.trackId === trackId && c.slug === slug && c.id !== id)
  }

  private nextChapterPosition(trackId: number, level: ChapterLevel): number {
    return nextPosition(this.chapters.filter((c) => c.trackId === trackId && c.level === level))
  }
}
