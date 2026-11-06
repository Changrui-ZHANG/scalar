import type { PublicationStatus } from '@scalar/shared/enums'

import type { QUESTIONNAIRE_QUESTION_KINDS } from '../constants.ts'

export type QuestionnaireQuestionKind = (typeof QUESTIONNAIRE_QUESTION_KINDS)[number]

export interface QuestionnaireQuestion {
  id: number
  position: number
  kind: QuestionnaireQuestionKind
  title: string
  description: string | null
  weight: number
  // Remplis pour les questions `code` seulement.
  functionName: string | null
  starterCode: string | null
  // Jamais renvoyee au navigateur.
  solutionCode: string | null
  status: PublicationStatus
  createdAt: Date
  updatedAt: Date
}
