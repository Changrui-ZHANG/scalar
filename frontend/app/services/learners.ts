import type { LearnerProgress } from '~/types/account'
import { apiFetch } from './api'

/** Crée un apprenant anonyme ; son identifiant rattache ensuite les vérifications. */
export async function createLearner(): Promise<string> {
  const learner = await apiFetch<{ id: string }>('/learners', { method: 'POST' })
  return learner.id
}

export function fetchLearnerProgress(learnerId: string): Promise<LearnerProgress> {
  return apiFetch<LearnerProgress>(`/learners/${encodeURIComponent(learnerId)}/progress`)
}
