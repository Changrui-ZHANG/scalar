import type { JsonValue } from '@scalar/shared/api'

export interface ExerciseTestCase {
  id: number
  exerciseId: number
  position: number
  arguments: readonly JsonValue[]
  expectedResult: JsonValue
  isHidden: boolean
  description: string | null
  createdAt: Date
  updatedAt: Date
}
