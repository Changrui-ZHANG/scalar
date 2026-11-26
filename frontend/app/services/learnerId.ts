import { LEARNER_STORAGE_KEY, parseLearnerId } from '~/utils/storage'

// Identifiant de l'apprenant anonyme, gardé dans le navigateur.
// Le stockage peut être bloqué : on fait alors sans, la vérification marche
// quand même, elle n'est simplement rattachée à personne.

export function readLearnerId(): string | null {
  try {
    return parseLearnerId(localStorage.getItem(LEARNER_STORAGE_KEY))
  } catch {
    return null
  }
}

export function saveLearnerId(id: string): void {
  try {
    localStorage.setItem(LEARNER_STORAGE_KEY, id)
  } catch {
    // Stockage plein ou bloqué
  }
}

export function forgetLearnerId(): void {
  try {
    localStorage.removeItem(LEARNER_STORAGE_KEY)
  } catch {
    // Stockage bloqué
  }
}
