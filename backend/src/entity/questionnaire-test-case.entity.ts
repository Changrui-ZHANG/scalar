import type { JsonValue } from '@scalar/shared/api'

export interface QuestionnaireTestCase {
  id: number
  questionId: number
  position: number
  arguments: readonly JsonValue[]
  expectedResult: JsonValue
  isHidden: boolean
  description: string | null
  createdAt: Date
  updatedAt: Date
}
