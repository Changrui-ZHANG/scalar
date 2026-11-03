import type { PrismaClient } from '@prisma/client'

import { ORDER_BY_POSITION, PUBLISHED } from '../constants.ts'
import type { Chapter } from '../entity/chapter.entity.ts'
import type { Exercise } from '../entity/exercise.entity.ts'
import type { ExerciseTestCase } from '../entity/exercise-test-case.entity.ts'
import type { Lesson } from '../entity/lesson.entity.ts'
import type { Track } from '../entity/track.entity.ts'
import type { ExerciseRepository } from './exercise.repository.ts'
import { toChapter, toExercise, toExerciseTestCase, toLesson, toTrack } from './prisma.mapper.ts'
import type { LessonRepository } from './lesson.repository.ts'
import type { TrackRepository } from './track.repository.ts'

export class PrismaTrackRepository implements TrackRepository {
  private readonly prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  async listTracks(): Promise<Track[]> {
    const rows = await this.prisma.track.findMany({
      where: { status: PUBLISHED },
      orderBy: ORDER_BY_POSITION,
    })
    return rows.map(toTrack)
  }

  async findTrackBySlug(slug: string): Promise<Track | null> {
    const row = await this.prisma.track.findFirst({ where: { slug, status: PUBLISHED } })
    return row && toTrack(row)
  }

  async listChapters(trackId: number): Promise<Chapter[]> {
    const rows = await this.prisma.chapter.findMany({
      where: { trackId, status: PUBLISHED },
      // Un enum PostgreSQL se trie dans l'ordre de declaration de ses valeurs.
      orderBy: [{ level: 'asc' }, ORDER_BY_POSITION],
    })
    return rows.map(toChapter)
  }

  async findChapter(trackId: number, slug: string): Promise<Chapter | null> {
    const row = await this.prisma.chapter.findFirst({ where: { trackId, slug, status: PUBLISHED } })
    return row && toChapter(row)
  }
}

export class PrismaExerciseRepository implements ExerciseRepository {
  private readonly prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  async listExercises(chapterId: number): Promise<Exercise[]> {
    const rows = await this.prisma.exercise.findMany({
      where: { chapterId, status: PUBLISHED },
      orderBy: ORDER_BY_POSITION,
    })
    return rows.map(toExercise)
  }

  async findExercise(chapterId: number, slug: string): Promise<Exercise | null> {
    const row = await this.prisma.exercise.findFirst({
      where: { chapterId, slug, status: PUBLISHED },
    })
    return row && toExercise(row)
  }

  async listTestCases(exerciseId: number): Promise<ExerciseTestCase[]> {
    const rows = await this.prisma.exerciseTestCase.findMany({
      where: { exerciseId },
      orderBy: ORDER_BY_POSITION,
    })
    return rows.map(toExerciseTestCase)
  }
}

export class PrismaLessonRepository implements LessonRepository {
  private readonly prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  async listLessons(chapterId: number): Promise<Lesson[]> {
    const rows = await this.prisma.lesson.findMany({
      where: { chapterId, status: PUBLISHED },
      orderBy: ORDER_BY_POSITION,
    })
    return rows.map(toLesson)
  }

  async findLesson(chapterId: number, slug: string): Promise<Lesson | null> {
    const row = await this.prisma.lesson.findFirst({
      where: { chapterId, slug, status: PUBLISHED },
    })
    return row && toLesson(row)
  }
}
