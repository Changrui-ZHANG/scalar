<script setup lang="ts">
// Importé explicitement, et non par l'auto-import de Nuxt : les imports issus
// d'un balayage de répertoire ne sont pas injectés sous l'environnement de
// test, où le composant est monté directement. Un import qui ne tient que
// pendant la construction rendrait le composant intestable.
import { storeToRefs } from 'pinia'
import { useSessionStore } from '~/stores/session'
import Button from '../components/ui/button/Button.vue'

useSeoMeta({
  title: 'Tableau de bord — Scalar',
  description: 'Votre point de départ sur Scalar.',
})

const { compte } = storeToRefs(useSessionStore())
</script>

<template>
  <section class="py-section-y flex flex-col items-start gap-4">
    <p v-if="compte" class="text-body-sm text-muted-foreground">Bonjour {{ compte.displayName }}</p>

    <!-- État vide, et non état d'erreur : ne pas avoir encore de Parcours est
         la situation normale d'un compte qui vient d'être créé. -->
    <h1 class="font-display text-display-sm text-foreground">
      Vous n’avez pas encore de Parcours.
    </h1>
    <p class="text-body text-foreground max-w-prose">
      Le Diagnostic situe votre niveau réel, puis Scalar en déduit le Parcours qui commence là où
      vous en êtes.
    </p>

    <!-- Un seul bouton primaire par vue. -->
    <Button size="lg" class="mt-2 min-h-11 rounded-md px-5 font-bold">
      Commencer le Diagnostic
    </Button>
  </section>
</template>
