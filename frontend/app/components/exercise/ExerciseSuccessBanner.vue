<script setup lang="ts">
// Bandeau « Exercice réussi » à la place du panneau Résultat (specs-site.md § 7.2).
import type { Episode } from '~/types/episode'

interface Props {
  caseCount: number // « n cas sur n »
  next: Episode | null // épisode suivant dans l'ordre du fil ; null : dernier du parcours
  overviewPath: string // vue d'ensemble, pour « Parcours terminé »
}

const { caseCount, next, overviewPath } = defineProps<Props>()
</script>

<template>
  <div
    class="rounded-card border-success bg-success-soft flex shrink-0 flex-col gap-3 border px-4.5 py-4 sm:flex-row sm:items-center sm:justify-between"
    aria-live="polite"
  >
    <div class="flex items-center gap-3">
      <span class="bg-success flex size-9.5 shrink-0 items-center justify-center rounded-full">
        <Icon name="lucide:check" class="text-on-primary size-5" />
      </span>
      <div class="flex flex-col gap-0.5">
        <p class="font-display text-success text-lg font-semibold">Exercice réussi</p>
        <p class="text-text-muted text-sm">
          {{ caseCount }} cas sur {{ caseCount }}, et le programme s’exécute sans erreur.
        </p>
      </div>
    </div>

    <div class="shrink-0">
      <UiButton v-if="next" dense :to="next.path" icon-right="lucide:arrow-right">
        Suivant : {{ next.title }}
      </UiButton>
      <UiButton v-else dense :to="overviewPath" icon-right="lucide:arrow-right"
        >Parcours terminé</UiButton
      >
    </div>
  </div>
</template>
