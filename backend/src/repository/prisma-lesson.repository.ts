import type { PrismaClient } from '@prisma/client'

import { ORDER_BY_POSITION, PUBLISHED } from '../constants.ts'
import type { Lesson } from '../entity/lesson.entity.ts'
import type { LessonRepository } from './lesson.repository.ts'
import { toLesson } from './prisma.mapper.ts'

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
