<script setup lang="ts">
// « Vos parcours » de l'accueil habitué (specs-site.md § 4.2) : une carte par parcours.
import type { TrackCard, TrackStatus } from '~/types/episode'

interface Props {
  cards: readonly TrackCard[]
}

const { cards } = defineProps<Props>()

// Libellé et couleur de l'étiquette selon l'état du parcours.
const statusLabels: Record<TrackStatus, string> = {
  not_started: 'À commencer',
  in_progress: 'En cours',
  completed: 'Terminé',
}
const statusTones: Record<TrackStatus, 'muted' | 'primary' | 'success'> = {
  not_started: 'muted',
  in_progress: 'primary',
  completed: 'success',
}
</script>

<template>
  <section class="flex flex-col gap-3.5">
    <div class="flex items-end justify-between gap-4">
      <h2 class="font-display text-text text-2xl font-semibold">Vos parcours</h2>
      <NuxtLink
        to="/parcours"
        class="text-ui text-primary flex items-center gap-1 font-semibold hover:underline"
      >
        Tous les parcours
        <Icon name="lucide:arrow-right" class="size-3.5" />
      </NuxtLink>
    </div>

    <div class="grid grid-cols-1 gap-4.5 md:grid-cols-3">
      <NuxtLink
        v-for="card in cards"
        :key="card.view.track.slug"
        :to="`/parcours/${card.view.track.slug}`"
        class="rounded-tile border-border bg-surface hover:border-primary flex flex-col gap-3.5 border p-5.5"
      >
        <div class="flex items-center justify-between">
          <span
            class="bg-primary-soft text-label text-primary flex size-10.5 items-center justify-center rounded-xl font-bold"
          >
            {{ initials(card.view.track.name) }}
          </span>
          <UiTag :tone="statusTones[card.progress.status]">{{
            statusLabels[card.progress.status]
          }}</UiTag>
        </div>

        <h3 class="font-display text-card text-text font-semibold">{{ card.view.track.name }}</h3>

        <p class="text-text-muted text-sm">
          {{ countLabel(card.view.chapters.length, 'chapitre', 'chapitres') }} ·
          {{ countLabel(card.progress.total, 'épisode', 'épisodes') }}
        </p>
        <p v-if="card.prerequisite" class="text-text-muted text-sm">
          Conseillé après {{ card.prerequisite.name }}
        </p>

        <UiProgressBar
          :value="card.progress.percent"
          :label="`Progression du parcours ${card.view.track.name}`"
        />
        <p class="text-meta text-text-muted">{{ card.progress.percent }} % terminé</p>
      </NuxtLink>
    </div>
  </section>
</template>
