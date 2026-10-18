import type { Exercise, ExerciseTestCase } from '../db/schema.ts'
import { MOCK_EXERCISES, MOCK_EXERCISE_TEST_CASES } from './exercise.mock.ts'

/**
 * Acces aux exercices d'un chapitre et a leurs cas de test.
 * Seuls les exercices publies sont servis ; un slug est unique dans son chapitre.
 */
export interface ExerciseRepository {
  /** Exercices publies d'un chapitre, tries par position. */
  listExercises(chapterId: number): Promise<readonly Exercise[]>
  findExercise(chapterId: number, slug: string): Promise<Exercise | null>
  /** Cas de test d'un exercice, tries par position. */
  listTestCases(exerciseId: number): Promise<readonly ExerciseTestCase[]>
}

const byPosition = (a: { position: number }, b: { position: number }): number =>
  a.position - b.position

// Donnees fictives en memoire ; PrismaExerciseRepository pour la base.
export class InMemoryExerciseRepository implements ExerciseRepository {
  private readonly exercises: readonly Exercise[]
  private readonly testCases: readonly ExerciseTestCase[]

  constructor(
    exercises: readonly Exercise[] = MOCK_EXERCISES,
    testCases: readonly ExerciseTestCase[] = MOCK_EXERCISE_TEST_CASES,
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
