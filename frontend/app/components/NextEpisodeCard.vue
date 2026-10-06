<script setup lang="ts">
/** Carte contrastee qui pousse vers un episode : « Continuer », « À suivre », « Épisode suivant ». */
defineProps<{
  eyebrow: string
  episode: TrackEpisode
  actionLabel: string
  description?: string
}>()
</script>

<template>
  <section
    class="bg-foreground text-background grid gap-5 rounded-2xl p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8"
  >
    <div class="grid justify-items-start gap-2">
      <p class="text-xs font-semibold tracking-[0.12em] uppercase opacity-75">{{ eyebrow }}</p>
      <p class="text-body-sm opacity-75">
        Épisode {{ padNumber(episode.number) }} · {{ EPISODE_TYPE_LABELS[episode.type] }} · Chapitre
        {{ episode.chapterNumber }} — {{ episode.chapterTitle }}
      </p>
      <h2 class="text-2xl font-semibold sm:text-3xl">{{ episode.title }}</h2>
      <p v-if="description" class="max-w-prose opacity-80">{{ description }}</p>
    </div>
    <NuxtLink
      :to="episode.route"
      class="btn bg-background text-foreground justify-self-start border-transparent hover:opacity-90"
    >
      {{ actionLabel }} <span aria-hidden="true">→</span>
    </NuxtLink>
  </section>
</template>
