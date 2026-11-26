import type { VerificationResult } from '@scalar/shared/api'
import type { PublicQuestion, QuestionnaireAnswers, QuestionnaireResult } from '~/types/questionnaire'
import { apiFetch } from './api'

export function fetchQuestionnaire(): Promise<readonly PublicQuestion[]> {
  return apiFetch<readonly PublicQuestion[]>('/questionnaire')
}

/** Essai du code d'une question : rien n'est enregistré, le score vient de l'envoi final. */
export function tryQuestionCode(questionId: number, code: string): Promise<VerificationResult> {
  return apiFetch<VerificationResult>(`/questionnaire/exercises/${questionId}/verifications`, {
    method: 'POST',
    body: { code },
    timeout: 20_000,
  })
}

/** headers : X-Learner-Id d'un apprenant anonyme, pour enregistrer le résultat. */
export function submitQuestionnaire(
  answers: QuestionnaireAnswers,
  headers: Record<string, string>,
): Promise<QuestionnaireResult> {
  return apiFetch<QuestionnaireResult>('/questionnaire/results', {
    method: 'POST',
    body: { choices: answers.choices, submissions: answers.submissions },
    headers,
    timeout: 30_000,
  })
}
