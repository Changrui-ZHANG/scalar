import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { situationDominante } from '@scalar/shared/session.ts'
import type { ChargeUtileSession } from '@scalar/shared/session.ts'

// Les imports de `pinia` et de `vue` sont explicites plutôt que laissés à
// l'auto-import : les présets d'auto-import ne sont pas injectés sous
// l'environnement de test, où ce module est chargé directement.
//
// La charge utile de session est partagée entre le layout — qui rend le bandeau
// — et les pages : c'est exactement ce que Pinia est censé porter, et rien
// d'autre n'y entre. L'état local d'un formulaire reste dans son composant.
//
// Sa forme n'est pas redéclarée ici : elle est importée de l'espace partagé,
// ce qui fait d'une divergence avec le backend une erreur de compilation.
export const useSessionStore = defineStore('session', () => {
  const compte = ref<ChargeUtileSession | null>(null)

  // Une seule situation s'affiche à la fois, et c'est la plus restrictive.
  // L'ordre n'est pas décidé ici : il est déclaré dans le contrat, et cette
  // page ne fait que lire le premier candidat qu'il désigne.
  const situation = computed(() =>
    compte.value === null ? undefined : situationDominante(compte.value.situations),
  )

  function ouvrir(charge: ChargeUtileSession) {
    compte.value = charge
  }

  function fermer() {
    compte.value = null
  }

  return { compte, situation, ouvrir, fermer }
})
