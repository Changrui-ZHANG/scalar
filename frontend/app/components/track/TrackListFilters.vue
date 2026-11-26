<script setup lang="ts">
// Filtres en pilules de /parcours (specs-site.md § 5.1) : Tous, En cours, Non commencés, Terminés.
import type { TrackFilter } from '~/types/episode'

const filter = defineModel<TrackFilter>({ required: true })

const filters: { value: TrackFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'not_started', label: 'Non commencés' },
  { value: 'completed', label: 'Terminés' },
]
</script>

<template>
  <div role="radiogroup" aria-label="Filtrer les parcours" class="flex flex-wrap gap-2">
    <button
      v-for="item in filters"
      :key="item.value"
      type="button"
      role="radio"
      :aria-checked="filter === item.value"
      class="cursor-pointer rounded-full px-3.5 py-1.75 text-sm font-semibold"
      :class="
        filter === item.value
          ? 'bg-text text-bg'
          : 'border-border bg-surface text-text-muted hover:text-text border'
      "
      @click="filter = item.value"
    >
      {{ item.label }}
    </button>
  </div>
</template>
