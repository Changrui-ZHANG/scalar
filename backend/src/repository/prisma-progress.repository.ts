import type { PrismaClient } from '@prisma/client'

import type { ExerciseProgress } from '../entity/exercise-progress.entity.ts'
import type { LessonProgress } from '../entity/lesson-progress.entity.ts'
import { toExerciseProgress, toLessonProgress } from './prisma.mapper.ts'
import type { ProgressRepository } from './progress.repository.ts'
import { earliest, mergeExerciseProgress } from './progress.repository.ts'

export class PrismaProgressRepository implements ProgressRepository {
  private readonly prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  async recordAttempt(
    userId: string,
    exerciseId: number,
    passed: boolean,
    at: Date,
  ): Promise<ExerciseProgress> {
    const where = { userId_exerciseId: { userId, exerciseId } }
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.exerciseProgress.upsert({
        where,
        create: {
          userId,
          exerciseId,
          attempts: 1,
          firstPassedAt: passed ? at : null,
          lastAttemptAt: at,
        },
        update: { attempts: { increment: 1 }, lastAttemptAt: at },
      })
      if (!passed || row.firstPassedAt !== null) {
        return toExerciseProgress(row)
      }
      return toExerciseProgress(
        await tx.exerciseProgress.update({ where, data: { firstPassedAt: at } }),
      )
    })
  }

  async findProgress(userId: string, exerciseId: number): Promise<ExerciseProgress | null> {
    const row = await this.prisma.exerciseProgress.findUnique({
      where: { userId_exerciseId: { userId, exerciseId } },
    })
    return row && toExerciseProgress(row)
  }

  async countAttempts(): Promise<{ readonly attempted: number; readonly passed: number }> {
    const [attempted, passed] = await Promise.all([
      this.prisma.exerciseProgress.count(),
      this.prisma.exerciseProgress.count({ where: { firstPassedAt: { not: null } } }),
    ])
    return { attempted, passed }
  }

  async listProgress(userId: string): Promise<ExerciseProgress[]> {
    const rows = await this.prisma.exerciseProgress.findMany({
      where: { userId },
      orderBy: { exerciseId: 'asc' },
    })
    return rows.map(toExerciseProgress)
  }

  async recordLessonCompletion(
    userId: string,
    lessonId: number,
    at: Date,
  ): Promise<LessonProgress> {
    // update vide : une lecon deja terminee garde sa premiere date.
    const row = await this.prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: { userId, lessonId, completedAt: at },
      update: {},
    })
    return toLessonProgress(row)
  }

  async listLessonCompletions(userId: string): Promise<LessonProgress[]> {
    const rows = await this.prisma.lessonProgress.findMany({
      where: { userId },
      orderBy: { lessonId: 'asc' },
    })
    return rows.map(toLessonProgress)
  }

  async mergeProgress(fromUserId: string, intoUserId: string): Promise<void> {
    // Une seule transaction : une connexion interrompue ne laisse pas une fusion a moitie faite.
    await this.prisma.$transaction(async (tx) => {
      const exercises = await tx.exerciseProgress.findMany({ where: { userId: fromUserId } })
      for (const from of exercises) {
        const where = { userId_exerciseId: { userId: intoUserId, exerciseId: from.exerciseId } }
        const into = await tx.exerciseProgress.findUnique({ where })
        if (into === null) {
          await tx.exerciseProgress.create({
            data: {
              userId: intoUserId,
              exerciseId: from.exerciseId,
              attempts: from.attempts,
              firstPassedAt: from.firstPassedAt,
              lastAttemptAt: from.lastAttemptAt,
            },
          })
        } else {
          const merged = mergeExerciseProgress(toExerciseProgress(into), toExerciseProgress(from))
          await tx.exerciseProgress.update({
            where,
            data: {
              attempts: merged.attempts,
              firstPassedAt: merged.firstPassedAt,
              lastAttemptAt: merged.lastAttemptAt,
            },
          })
        }
      }

      const lessons = await tx.lessonProgress.findMany({ where: { userId: fromUserId } })
      for (const from of lessons) {
        const where = { userId_lessonId: { userId: intoUserId, lessonId: from.lessonId } }
        const into = await tx.lessonProgress.findUnique({ where })
        if (into === null) {
          await tx.lessonProgress.create({
            data: { userId: intoUserId, lessonId: from.lessonId, completedAt: from.completedAt },
          })
        } else {
          const completedAt = earliest(into.completedAt, from.completedAt) ?? into.completedAt
          await tx.lessonProgress.update({ where, data: { completedAt } })
        }
      }
    })
  }
}
