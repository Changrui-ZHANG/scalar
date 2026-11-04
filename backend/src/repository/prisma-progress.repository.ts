import type { PrismaClient } from '@prisma/client'

import type { ExerciseProgress } from '../entity/exercise-progress.entity.ts'
import { toExerciseProgress } from './prisma.mapper.ts'
import type { ProgressRepository } from './progress.repository.ts'

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

  async listProgress(userId: string): Promise<ExerciseProgress[]> {
    const rows = await this.prisma.exerciseProgress.findMany({
      where: { userId },
      orderBy: { exerciseId: 'asc' },
    })
    return rows.map(toExerciseProgress)
  }
}
