<script setup lang="ts">
import type { Episode } from '~/types/episode'

interface Props {
  caseCount: number
  next: Episode | null
  overviewPath: string
}

const props = defineProps<Props>()

const destination = computed(() => props.next?.path ?? props.overviewPath)
const buttonLabel = computed(() => (props.next ? `Suivant : ${props.next.title}` : 'Parcours terminé'))
</script>

<template>
  <div class="m-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-[14px] border border-success bg-success-soft p-5 text-success">
    <div class="flex items-center gap-3.5">
      <div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-success text-on-primary">
        <Icon name="lucide:check" class="size-5" />
      </div>

      <div class="flex flex-col">
        <h3 class="font-display text-lg font-bold text-text">
          Exercice réussi
        </h3>
        <p class="text-xs text-text-muted">
          {{ caseCount }} cas sur {{ caseCount }}, et le programme s'exécute sans erreur.
        </p>
      </div>
    </div>

    <UiButton
      :to="destination"
      variant="primary"
      icon="lucide:arrow-right"
    >
      {{ buttonLabel }}
    </UiButton>
  </div>
</template>
