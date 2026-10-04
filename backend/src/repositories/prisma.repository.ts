/**
 * Implementations PostgreSQL des depots, via Prisma.
 *
 * Meme contrat que les versions en memoire : seul le contenu publie est servi,
 * trie par position. Les services ne savent pas laquelle ils utilisent.
 */

import type { PrismaClient } from '@prisma/client'

import type {
  Chapter,
  Exercise,
  ExerciseTestCase,
  Language,
  Lesson,
  LessonCategory,
} from '../db/schema.ts'
import type { ExerciseRepository } from './exercise.repository.ts'
import type { LanguageRepository } from './language.repository.ts'
import type { LessonRepository } from './lesson.repository.ts'

const PUBLISHED = 'published' as const
const BY_POSITION = { position: 'asc' } as const

export class PrismaLanguageRepository implements LanguageRepository {
  private readonly prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  listLanguages(): Promise<Language[]> {
    return this.prisma.language.findMany({ where: { status: PUBLISHED }, orderBy: BY_POSITION })
  }

  findLanguageBySlug(slug: string): Promise<Language | null> {
    return this.prisma.language.findFirst({ where: { slug, status: PUBLISHED } })
  }

  findLanguageById(id: number): Promise<Language | null> {
    return this.prisma.language.findFirst({ where: { id, status: PUBLISHED } })
  }
}

export class PrismaExerciseRepository implements ExerciseRepository {
  private readonly prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  listChapters(languageId: number): Promise<Chapter[]> {
    return this.prisma.chapter.findMany({
      where: { languageId, status: PUBLISHED },
      orderBy: BY_POSITION,
    })
  }

  findChapter(languageId: number, slug: string): Promise<Chapter | null> {
    return this.prisma.chapter.findFirst({ where: { languageId, slug, status: PUBLISHED } })
  }

  findChapterById(id: number): Promise<Chapter | null> {
    return this.prisma.chapter.findFirst({ where: { id, status: PUBLISHED } })
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

  listCategories(): Promise<LessonCategory[]> {
    return this.prisma.lessonCategory.findMany({ orderBy: BY_POSITION })
  }

  findCategoryBySlug(slug: string): Promise<LessonCategory | null> {
    return this.prisma.lessonCategory.findUnique({ where: { slug } })
  }

  listLessons(languageId: number | null): Promise<Lesson[]> {
    return this.prisma.lesson.findMany({
      where: { languageId, status: PUBLISHED },
      orderBy: BY_POSITION,
    })
  }

  findLesson(languageId: number | null, slug: string): Promise<Lesson | null> {
    return this.prisma.lesson.findFirst({ where: { languageId, slug, status: PUBLISHED } })
  }

  async listChapterIds(lessonId: number): Promise<number[]> {
    const links = await this.prisma.lessonChapter.findMany({
      where: { lessonId },
      select: { chapterId: true },
    })
    return links.map((l) => l.chapterId)
  }

  listLessonsForChapter(chapterId: number): Promise<Lesson[]> {
    return this.prisma.lesson.findMany({
      where: { status: PUBLISHED, chapters: { some: { chapterId } } },
      orderBy: BY_POSITION,
    })
  }
}
