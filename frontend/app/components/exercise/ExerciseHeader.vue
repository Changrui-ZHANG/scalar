<script setup lang="ts">
// Surtitre et titre de l'exercice (specs-site.md § 7.1).
import type { PublicExercise } from '@scalar/shared/api'
import type { Episode } from '~/types/episode'

interface Props {
  exercise: PublicExercise
  episode: Episode
}

const { exercise, episode } = defineProps<Props>()
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <p class="flex flex-wrap items-center gap-2">
      <UiTag tone="exercise" icon="lucide:code-xml">Exercice</UiTag>
      <span class="text-meta text-text-muted">
        Chapitre {{ episode.chapter.number }} · épisode {{ episode.indexInChapter }} sur
        {{ episode.chapterEpisodeCount }}
      </span>
    </p>
    <h1 class="font-display text-text md:text-title text-2xl font-semibold tracking-tight">
      {{ exercise.title }}
    </h1>
  </div>
</template>
