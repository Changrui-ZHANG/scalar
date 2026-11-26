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

/** Leçon terminée ; rappeler la route ne change rien (le serveur garde la première date). */
export async function completeLesson(
  track: string,
  chapter: string,
  lesson: string,
  headers: Record<string, string>,
): Promise<void> {
  await apiFetch<{ completedAt: string }>(
    `/tracks/${encodeURIComponent(track)}/chapters/${encodeURIComponent(chapter)}/lessons/${encodeURIComponent(lesson)}/completions`,
    { method: 'POST', headers },
  )
}
