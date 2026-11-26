import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Account, Credentials } from '~/types/account'
import * as authService from '~/services/auth'
import { forgetLearnerId, readLearnerId, saveLearnerId } from '~/services/learnerId'
import { createLearner, fetchLearnerProgress } from '~/services/learners'
import { useProgressStore } from '~/stores/progress'
import { exerciseKey } from '~/utils/track'

export const useAuthStore = defineStore('auth', () => {
  // null : visiteur sans compte (ou session expirée).
  const account = ref<Account | null>(null)
  // Vrai une fois /auth/me lu : avant, on ne sait pas encore si le visiteur est connecté.
  const loaded = ref(false)

  // Appelée au montage de l'application (app.vue), comme la progression :
  // le rendu serveur se fait sans compte, puis l'en-tête se met à jour.
  async function loadSession(): Promise<void> {
    try {
      account.value = await authService.fetchMe()
    } catch {
      // 401 : pas de session. Autre erreur : on reste sans compte, le site marche quand même.
      account.value = null
    }
    loaded.value = true
    await syncServerProgress()
  }

  async function login(credentials: Credentials): Promise<void> {
    account.value = await authService.login(credentials)
    // Le compte a sa propre progression : l'apprenant anonyme de ce navigateur ne sert plus.
    forgetLearnerId()
    await syncServerProgress()
  }

  // Le compte reprend l'apprenant anonyme de ce navigateur, avec ses exercices réussis.
  async function register(credentials: Credentials): Promise<void> {
    account.value = await authService.register(credentials, readLearnerId())
    forgetLearnerId()
    await syncServerProgress()
  }

  async function logout(): Promise<void> {
    try {
      await authService.logout()
    } finally {
      account.value = null
    }
  }

  /**
   * En-têtes à joindre à une vérification d'exercice pour qu'elle soit enregistrée.
   * Connecté : aucun, le cookie de session suffit. Sinon : X-Learner-Id d'un
   * apprenant anonyme, créé à la première vérification.
   */
  async function learnerHeaders(): Promise<Record<string, string>> {
    if (account.value) {
      return {}
    }
    let learnerId = readLearnerId()
    if (learnerId === null) {
      try {
        learnerId = await createLearner()
        saveLearnerId(learnerId)
      } catch {
        // Création refusée (trop de demandes, serveur indisponible) : vérification sans suivi.
        return {}
      }
    }
    return { 'X-Learner-Id': learnerId }
  }

  /** Ajoute à la progression du navigateur les exercices réussis enregistrés pour le compte. */
  async function syncServerProgress(): Promise<void> {
    if (!account.value) {
      return
    }
    try {
      const serverProgress = await fetchLearnerProgress(account.value.id)
      const progressStore = useProgressStore()

      // Les clés d'épisode sont rangées par parcours.
      const keysByTrack: Record<string, string[]> = {}
      for (const attempt of serverProgress.exercises) {
        if (!attempt.passed) continue
        const keys = keysByTrack[attempt.track] ?? []
        keys.push(exerciseKey(attempt.chapter, attempt.exercise))
        keysByTrack[attempt.track] = keys
      }

      for (const track of Object.keys(keysByTrack)) {
        progressStore.addCompleted(track, keysByTrack[track] ?? [])
      }
    } catch {
      // Progression du serveur illisible : celle du navigateur reste affichée.
    }
  }

  return { account, loaded, loadSession, login, register, logout, learnerHeaders }
})
