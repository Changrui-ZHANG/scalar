import type { Exercise } from './exercise.entity.ts'
import type { ExerciseTestCase } from './exercise-test-case.entity.ts'

export interface AdminExercise extends Exercise {
  testCases: readonly ExerciseTestCase[]
}
