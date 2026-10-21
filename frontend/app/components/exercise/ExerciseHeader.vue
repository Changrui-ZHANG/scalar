<script setup lang="ts">
import type { PublicExercise } from '@scalar/shared/api'
import type { Episode } from '~/types/episode'

interface Props {
  exercise: PublicExercise
  episode: Episode
}

defineProps<Props>()
</script>

<template>
  <div class="flex flex-col gap-2 pb-4">
    <div class="flex items-center gap-3">
      <UiTag tone="exercise">
        Exercice
      </UiTag>
      <span class="text-xs font-medium text-text-muted">
        Chapitre {{ episode.chapter.number }} · épisode {{ episode.indexInChapter }} sur {{ episode.chapterEpisodeCount }}
      </span>
    </div>

    <h1 class="font-display text-2xl md:text-3xl font-bold text-text">
      {{ exercise.title }}
    </h1>
  </div>
</template>
