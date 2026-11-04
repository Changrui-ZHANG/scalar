import type { PrismaClient } from '@prisma/client'

import { ORDER_BY_POSITION, PUBLISHED } from '../constants.ts'
import type { Exercise } from '../entity/exercise.entity.ts'
import type { ExerciseTestCase } from '../entity/exercise-test-case.entity.ts'
import type { ExerciseRepository } from './exercise.repository.ts'
import { toExercise, toExerciseTestCase } from './prisma.mapper.ts'

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
