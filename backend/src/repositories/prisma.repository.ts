/**
 * Implementations PostgreSQL des depots, via Prisma.
 *
 * Meme contrat que les versions en memoire : seul le contenu publie est servi,
 * dans le meme ordre. Les services ne savent pas laquelle ils utilisent.
 */

import type { PrismaClient } from '@prisma/client'

import type { Chapter, Exercise, ExerciseTestCase, Lesson, Track } from '../db/schema.ts'
import type { ExerciseRepository } from './exercise.repository.ts'
import type { LessonRepository } from './lesson.repository.ts'
import type { TrackRepository } from './track.repository.ts'

const PUBLISHED = 'published' as const
const BY_POSITION = { position: 'asc' } as const

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

  listExercises(chapterId: number): Promise<Exercise[]> {
    return this.prisma.exercise.findMany({
      where: { chapterId, status: PUBLISHED },
      orderBy: BY_POSITION,
    })
  }

  findExercise(chapterId: number, slug: string): Promise<Exercise | null> {
    return this.prisma.exercise.findFirst({ where: { chapterId, slug, status: PUBLISHED } })
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

  listLessons(chapterId: number): Promise<Lesson[]> {
    return this.prisma.lesson.findMany({
      where: { chapterId, status: PUBLISHED },
      orderBy: BY_POSITION,
    })
  }

  findLesson(chapterId: number, slug: string): Promise<Lesson | null> {
    return this.prisma.lesson.findFirst({ where: { chapterId, slug, status: PUBLISHED } })
  }
}
