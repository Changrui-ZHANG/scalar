import type { Exercise } from '../entity/exercise.entity.ts'
import type { ExerciseTestCase } from '../entity/exercise-test-case.entity.ts'
import { EXERCISES, EXERCISE_TEST_CASES } from '../content/exercises.ts'

export interface ExerciseRepository {
  listExercises(chapterId: number): Promise<readonly Exercise[]>
  findExercise(chapterId: number, slug: string): Promise<Exercise | null>
  listTestCases(exerciseId: number): Promise<readonly ExerciseTestCase[]>
}

const byPosition = (a: { position: number }, b: { position: number }): number =>
  a.position - b.position

export class InMemoryExerciseRepository implements ExerciseRepository {
  private readonly exercises: readonly Exercise[]
  private readonly testCases: readonly ExerciseTestCase[]

  constructor(
    exercises: readonly Exercise[] = EXERCISES,
    testCases: readonly ExerciseTestCase[] = EXERCISE_TEST_CASES,
  ) {
    this.exercises = exercises.filter((e) => e.status === 'published')
    this.testCases = testCases
  }

  async listExercises(chapterId: number): Promise<readonly Exercise[]> {
    return this.exercises.filter((e) => e.chapterId === chapterId).toSorted(byPosition)
  }

  async findExercise(chapterId: number, slug: string): Promise<Exercise | null> {
    return this.exercises.find((e) => e.chapterId === chapterId && e.slug === slug) ?? null
  }

  async listTestCases(exerciseId: number): Promise<readonly ExerciseTestCase[]> {
    return this.testCases.filter((t) => t.exerciseId === exerciseId).toSorted(byPosition)
  }
}
