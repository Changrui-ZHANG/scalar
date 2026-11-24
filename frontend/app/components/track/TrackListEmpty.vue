<script setup lang="ts">
import type { TrackFilter } from '~/types/episode'

interface Props {
  reason:
    { kind: 'filter'; filter: Exclude<TrackFilter, 'all'> } | { kind: 'search'; query: string }
}

const props = defineProps<Props>()

const message = computed(() => {
  if (props.reason.kind === 'search') {
    return `Aucun résultat pour « ${props.reason.query} ».`
  }
  switch (props.reason.filter) {
    case 'in_progress':
      return 'Aucun parcours en cours.'
    case 'not_started':
      return 'Aucun parcours non commencé.'
    case 'completed':
      return 'Aucun parcours terminé.'
    default:
      return 'Aucun parcours trouvé.'
  }
})
</script>

<template>
  <div
    class="rounded-card border-border bg-surface flex flex-col items-center justify-center border border-dashed p-12 text-center"
  >
    <Icon name="lucide:search-x" class="text-text-muted mb-3 size-8" />
    <p class="text-text-muted text-base font-medium">
      {{ message }}
    </p>
  </div>
</template>
