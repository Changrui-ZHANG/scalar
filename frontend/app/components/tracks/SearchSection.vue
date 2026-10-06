<script setup lang="ts">
const search = defineModel<string>({ required: true })

defineProps<{
  query: string
  filter: TrackFilter
  counts: Readonly<Record<TrackFilter, number>>
}>()

const emit = defineEmits<{
  submit: []
  reset: []
  filter: [value: TrackFilter]
}>()
</script>

<template>
  <section class="card grid gap-4 p-5 sm:p-6" aria-labelledby="recherche-titre">
    <h2 id="recherche-titre" class="font-sans text-lg font-bold">Rechercher dans les parcours</h2>
    <form role="search" class="flex flex-wrap gap-2" @submit.prevent="emit('submit')">
      <label for="recherche" class="sr-only"
        >Rechercher un langage, une notion ou un exercice</label
      >
      <input
        id="recherche"
        v-model="search"
        type="search"
        enterkeyhint="search"
        placeholder="Un langage, une notion ou un exercice…"
        class="bg-background placeholder:text-muted-foreground min-h-11 min-w-0 flex-1 rounded-lg border px-4"
      >
      <button v-if="query" type="button" class="btn-secondary" @click="emit('reset')">
        Effacer
      </button>
    </form>

    <div role="group" aria-label="Filtrer par statut" class="flex flex-wrap gap-2">
      <button
        v-for="f in TRACK_FILTERS"
        :key="f.value"
        type="button"
        :aria-pressed="filter === f.value"
        :disabled="counts[f.value] === 0 && filter !== f.value"
        class="min-h-11 rounded-full border px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
        :class="
          filter === f.value
            ? 'bg-brand text-brand-foreground border-transparent'
            : 'bg-surface hover:bg-foreground/5'
        "
        @click="emit('filter', f.value)"
      >
        {{ f.label }} <span class="tabular-nums">{{ counts[f.value] }}</span>
      </button>
    </div>
  </section>
</template>
