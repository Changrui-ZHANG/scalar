<script setup lang="ts">
interface TrackEntry {
  readonly track: TrackSummary
  readonly index: number
  readonly episodes: readonly TrackEpisode[]
  readonly status: TrackStatus
  readonly matches: readonly TrackEpisode[]
}

const props = defineProps<{
  query: string
  entries: readonly TrackEntry[]
  pending: boolean
  failed: boolean
  trackCount: number
}>()

const emit = defineEmits<{ reset: [] }>()

const resultLabel = computed(() => {
  const n = props.entries.length
  return n === 0
    ? 'Aucun parcours ne correspond'
    : `${n} ${n > 1 ? 'parcours correspondent' : 'parcours correspond'}`
})
</script>

<template>
  <section class="grid gap-6" aria-labelledby="liste-titre">
    <div class="grid gap-1">
      <h2 id="liste-titre" class="text-3xl font-semibold">
        {{ query ? `Résultats pour « ${query} »` : 'Tous les parcours' }}
      </h2>
      <p class="text-body-sm text-muted-foreground" aria-live="polite">{{ resultLabel }}</p>
    </div>

    <p v-if="pending" class="text-muted-foreground">Chargement des parcours…</p>

    <EmptyState
      v-else-if="!failed && !trackCount"
      title="Aucun parcours publié pour l’instant"
      description="Les premiers parcours arrivent bientôt."
    />

    <EmptyState
      v-else-if="!entries.length && trackCount"
      :title="query ? `Aucun résultat pour « ${query} »` : 'Aucun parcours dans ce filtre'"
      description="Essayez un autre mot : un parcours, une notion comme « conditions », ou le titre d’un exercice."
    >
      <button type="button" class="btn-secondary" @click="emit('reset')">
        Réinitialiser la recherche
      </button>
    </EmptyState>

    <ul v-else class="grid gap-5 md:grid-cols-2">
      <li v-for="entry in entries" :key="entry.track.slug" class="grid">
        <TrackCard
          :track="entry.track"
          :index="entry.index"
          :episodes="entry.episodes"
          :status="entry.status"
        >
          <div v-if="entry.matches.length" class="grid gap-2">
            <p class="text-body-sm font-semibold">
              {{ entry.matches.length }}
              {{ entry.matches.length > 1 ? 'épisodes correspondent' : 'épisode correspond' }}
            </p>
            <ul class="divide-y overflow-hidden rounded-xl border">
              <li v-for="episode in entry.matches" :key="episode.key">
                <EpisodeRow :episode="episode" />
              </li>
            </ul>
          </div>
        </TrackCard>
      </li>
    </ul>
  </section>
</template>
