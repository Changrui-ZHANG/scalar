/**
 * Implementations PostgreSQL des depots, via Prisma.
 *
 * Meme contrat que les versions en memoire : seul le contenu publie est servi,
 * dans le meme ordre. Les services ne savent pas laquelle ils utilisent.
 */

import type { Prisma, PrismaClient } from '@prisma/client'

import type { Chapter, Episode, Exercise, ExerciseTestCase, Lesson, Track } from '../db/schema.ts'
import type { ExerciseRepository } from './exercise.repository.ts'
import type { LessonRepository } from './lesson.repository.ts'
import type { TrackRepository } from './track.repository.ts'

const PUBLISHED = 'published' as const
const BY_POSITION = { position: 'asc' } as const
/** Lecons et exercices sont ranges par la position de leur episode. */
const BY_EPISODE_POSITION = { episode: BY_POSITION } as const

/** Le filtre d'une specialisation passe par son episode. */
const publishedIn = (chapterId: number, slug?: string) =>
  ({ episode: { chapterId, status: PUBLISHED, ...(slug === undefined ? {} : { slug }) } }) as const

/** Les champs communs, tels que les services les attendent. */
const episodeFields = (e: Episode) => ({
  id: e.id,
  chapterId: e.chapterId,
  slug: e.slug,
  position: e.position,
  title: e.title,
  status: e.status,
  firstPublishedAt: e.firstPublishedAt,
  createdAt: e.createdAt,
  updatedAt: e.updatedAt,
})

const LESSON_INCLUDE = { episode: true } as const
type LessonWithEpisode = Prisma.LessonGetPayload<{ include: typeof LESSON_INCLUDE }>

const toLesson = (row: LessonWithEpisode): Lesson => ({
  ...episodeFields(row.episode),
  summary: row.summary,
  body: row.body,
  lastReviewedAt: row.lastReviewedAt,
})

const EXERCISE_INCLUDE = { episode: true, hints: { orderBy: BY_POSITION } } as const
type ExerciseWithEpisode = Prisma.ExerciseGetPayload<{ include: typeof EXERCISE_INCLUDE }>

const toExercise = (row: ExerciseWithEpisode): Exercise => ({
  ...episodeFields(row.episode),
  instructions: row.instructions,
  functionName: row.functionName,
  starterCode: row.starterCode,
  solutionCode: row.solutionCode,
  hints: row.hints.map((h) => h.text),
  solutionCheckStatus: row.solutionCheckStatus,
  solutionCheckedAt: row.solutionCheckedAt,
})

export class PrismaTrackRepository implements TrackRepository {
  private readonly prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  listTracks(): Promise<Track[]> {
    return this.prisma.track.findMany({ where: { status: PUBLISHED }, orderBy: BY_POSITION })
  }

  findTrackBySlug(slug: string): Promise<Track | null> {
    return this.prisma.track.findFirst({ where: { slug, status: PUBLISHED } })
  }

  listChapters(trackId: number): Promise<Chapter[]> {
    return this.prisma.chapter.findMany({
      where: { trackId, status: PUBLISHED },
      // Un enum PostgreSQL se trie dans l'ordre de declaration de ses valeurs.
      orderBy: [{ level: 'asc' }, BY_POSITION],
    })
  }

  findChapter(trackId: number, slug: string): Promise<Chapter | null> {
    return this.prisma.chapter.findFirst({ where: { trackId, slug, status: PUBLISHED } })
  }
}

export class PrismaExerciseRepository implements ExerciseRepository {
  private readonly prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  async listExercises(chapterId: number): Promise<Exercise[]> {
    const rows = await this.prisma.exercise.findMany({
      where: publishedIn(chapterId),
      include: EXERCISE_INCLUDE,
      orderBy: BY_EPISODE_POSITION,
    })
    return rows.map(toExercise)
  }

  async findExercise(chapterId: number, slug: string): Promise<Exercise | null> {
    const row = await this.prisma.exercise.findFirst({
      where: publishedIn(chapterId, slug),
      include: EXERCISE_INCLUDE,
    })
    return row && toExercise(row)
  }

  listTestCases(exerciseId: number): Promise<ExerciseTestCase[]> {
    return this.prisma.exerciseTestCase.findMany({ where: { exerciseId }, orderBy: BY_POSITION })
  }
}

export class PrismaLessonRepository implements LessonRepository {
  private readonly prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  async listLessons(chapterId: number): Promise<Lesson[]> {
    const rows = await this.prisma.lesson.findMany({
      where: publishedIn(chapterId),
      include: LESSON_INCLUDE,
      orderBy: BY_EPISODE_POSITION,
    })
    return rows.map(toLesson)
  }

  async findLesson(chapterId: number, slug: string): Promise<Lesson | null> {
    const row = await this.prisma.lesson.findFirst({
      where: publishedIn(chapterId, slug),
      include: LESSON_INCLUDE,
    })
    return row && toLesson(row)
  }
}
