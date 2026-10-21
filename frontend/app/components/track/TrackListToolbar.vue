<script setup lang="ts">
import type { TrackFilter } from '~/types/episode'

const query = defineModel<string>('query', { required: true })
const filter = defineModel<TrackFilter>('filter', { required: true })

const FILTERS: readonly { id: TrackFilter; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'in_progress', label: 'En cours' },
  { id: 'not_started', label: 'Non commencés' },
  { id: 'completed', label: 'Terminés' },
]
</script>

<template>
  <div class="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
    <!-- Pilules de filtre -->
    <div role="radiogroup" aria-label="Filtrer les parcours" class="flex flex-wrap items-center gap-2">
      <button
        v-for="f in FILTERS"
        :key="f.id"
        type="button"
        role="radio"
        :aria-checked="filter === f.id"
        class="inline-flex items-center rounded-full px-4 py-1.5 text-xs font-semibold transition-colors cursor-pointer"
        :class="[
          filter === f.id
            ? 'bg-text text-bg'
            : 'bg-surface border border-border text-text hover:bg-surface-muted',
        ]"
        @click="filter = f.id"
      >
        {{ f.label }}
      </button>
    </div>

    <!-- Champ recherche 340px -->
    <div class="relative w-full md:w-[340px]">
      <Icon
        name="lucide:search"
        class="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-text-muted pointer-events-none"
      />
      <input
        v-model="query"
        type="search"
        placeholder="Rechercher une notion, un titre…"
        class="h-10 w-full rounded-[12px] border border-border bg-surface pl-10 pr-4 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      >
    </div>
  </div>
</template>
