import type { PrismaClient } from '@prisma/client'

import { ORDER_BY_POSITION, PUBLISHED } from '../constants.ts'
import type { Chapter, Exercise, ExerciseTestCase, Lesson, Track } from '../database/types.ts'
import type { ExerciseRepository } from './exercise.repository.ts'
import type { LessonRepository } from './lesson.repository.ts'
import type { TrackRepository } from './track.repository.ts'

export class PrismaTrackRepository implements TrackRepository {
  private readonly prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  listTracks(): Promise<Track[]> {
    return this.prisma.track.findMany({ where: { status: PUBLISHED }, orderBy: ORDER_BY_POSITION })
  }

  findTrackBySlug(slug: string): Promise<Track | null> {
    return this.prisma.track.findFirst({ where: { slug, status: PUBLISHED } })
  }

  listChapters(trackId: number): Promise<Chapter[]> {
    return this.prisma.chapter.findMany({
      where: { trackId, status: PUBLISHED },
      // Un enum PostgreSQL se trie dans l'ordre de declaration de ses valeurs.
      orderBy: [{ level: 'asc' }, ORDER_BY_POSITION],
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
      orderBy: ORDER_BY_POSITION,
    })
  }

  findExercise(chapterId: number, slug: string): Promise<Exercise | null> {
    return this.prisma.exercise.findFirst({ where: { chapterId, slug, status: PUBLISHED } })
  }

  listTestCases(exerciseId: number): Promise<ExerciseTestCase[]> {
    return this.prisma.exerciseTestCase.findMany({
      where: { exerciseId },
      orderBy: ORDER_BY_POSITION,
    })
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
      orderBy: ORDER_BY_POSITION,
    })
  }

  findLesson(chapterId: number, slug: string): Promise<Lesson | null> {
    return this.prisma.lesson.findFirst({ where: { chapterId, slug, status: PUBLISHED } })
  }
}
