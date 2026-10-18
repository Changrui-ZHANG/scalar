<script setup lang="ts">
/**
 * Carte d'un parcours : numero, nom, statut, progression, prerequis et action.
 * Le slot recoit les episodes trouves par une recherche.
 */
const props = defineProps<{
  track: TrackSummary
  index: number
  episodes: readonly TrackEpisode[]
  status: TrackStatus
}>()

const ACTIONS: Readonly<Record<TrackStatus, string>> = {
  todo: 'Commencer ce parcours',
  active: 'Continuer le parcours',
  completed: 'Revoir le parcours',
}

const trackRoute = computed(() => `/parcours/${props.track.slug}`)
const progress = computed(() => progressOf(props.episodes))

/** Commencer ou continuer ouvre l'episode utile ; revoir ramene au fil complet. */
const actionRoute = computed(() =>
  props.status === 'completed'
    ? trackRoute.value
    : (firstIncomplete(props.episodes)?.route ?? trackRoute.value),
)
</script>

<template>
  <article class="card grid content-start gap-4 p-6">
    <div class="flex items-start justify-between gap-4">
      <span class="font-display text-muted-foreground text-3xl tabular-nums">
        {{ padNumber(index) }}
      </span>
      <StatusBadge :status="status" />
    </div>

    <h3 class="font-display text-3xl font-semibold">
      <NuxtLink :to="trackRoute" class="hover:underline">{{ track.name }}</NuxtLink>
    </h3>
    <p class="text-muted-foreground">{{ track.summary }}</p>

    <ProgressBar :progress="progress" />

    <p v-if="track.prerequisite" class="text-body-sm text-muted-foreground">
      <strong class="text-foreground">Prérequis recommandé :</strong> connaître les bases de
      <NuxtLink :to="`/parcours/${track.prerequisite.slug}`" class="underline">
        {{ track.prerequisite.name }}</NuxtLink
      >. Ce parcours reste accessible librement.
    </p>

    <slot />

    <NuxtLink :to="actionRoute" class="btn-primary justify-self-start">
      {{ ACTIONS[status] }} <span aria-hidden="true">→</span>
    </NuxtLink>
  </article>
</template>
