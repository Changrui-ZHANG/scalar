import type { JsonValue, TrackRef } from '@scalar/shared/api'

// GET /questionnaire : une question, sans les scores des options ni la solution.
export interface PublicQuestion {
  readonly id: number
  readonly position: number
  readonly kind: 'experience' | 'language' | 'knowledge' | 'code'
  readonly title: string
  readonly description: string | null
  readonly options: readonly { readonly id: number; readonly label: string }[]
  // Questions `code` seulement.
  readonly functionName: string | null
  readonly starterCode: string | null
  readonly testCases: readonly {
    readonly arguments: readonly JsonValue[]
    readonly expectedResult: JsonValue
    readonly description: string | null
  }[]
}

// POST /questionnaire/results
export interface QuestionnaireAnswers {
  readonly choices: readonly { readonly questionId: number; readonly optionId: number }[]
  readonly submissions: readonly { readonly questionId: number; readonly code: string }[]
}

export interface QuestionnaireResult {
  readonly score: number // sur 100
  readonly level: 'beginner' | 'intermediate' | 'advanced'
  readonly feedback: readonly string[]
  readonly track: TrackRef | null // parcours conseillé
  readonly startChapter: { readonly slug: string; readonly title: string } | null
  readonly exercises: readonly {
    readonly questionId: number
    readonly title: string
    readonly passed: boolean
    readonly passedCases: number
    readonly totalCases: number
  }[]
}
