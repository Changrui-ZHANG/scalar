<script setup lang="ts">
// Importé explicitement, et non par l'auto-import de Nuxt : les imports issus
// d'un balayage de répertoire ne sont pas injectés sous l'environnement de
// test, où le composant est monté directement. Un import qui ne tient que
// pendant la construction rendrait le composant intestable.
import { storeToRefs } from 'pinia'
import { useSessionStore } from '~/stores/session'
const store = useSessionStore()
const { compte, situation } = storeToRefs(store)

// Le bandeau annonce l'état et nomme l'adresse ciblée. Il ne dit pas qu'un lien
// de vérification a été envoyé : rien ne l'envoie encore, et l'annoncer serait
// promettre ce que le système ne fait pas. La phrase complète — et l'action de
// renvoi — revient avec le module qui les rend vraies.
const texte = computed(() => {
  if (situation.value !== 'compteNonVerifie') {
    return null
  }

  return {
    titre: 'Votre adresse n’est pas encore vérifiée.',
    corps: `Le Diagnostic et la soumission d’Exercice restent indisponibles tant que ${
      compte.value?.adresseAVerifier ?? 'votre adresse'
    } n’est pas confirmée. Le reste de la plateforme est accessible.`,
  }
})
</script>

<template>
  <!-- Persistant, non modal, non refermable tant que la condition tient : le
       refermer donnerait l'illusion que l'état a disparu. Ancré dans le flux
       sous l'en-tête plutôt que superposé, ce qui est aussi ce qui l'empêche
       d'occulter un élément qui vient de recevoir le focus. -->
  <div v-if="texte" role="status" aria-live="polite" class="border-primary bg-card border-b">
    <div class="max-w-content mx-auto flex flex-col gap-1 px-4 py-3">
      <p class="text-subtitle text-foreground">{{ texte.titre }}</p>
      <p class="text-body-sm text-foreground">{{ texte.corps }}</p>
    </div>
  </div>
</template>
