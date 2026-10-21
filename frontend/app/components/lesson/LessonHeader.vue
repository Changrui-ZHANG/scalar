<script setup lang="ts">
import type { LessonDetail } from '@scalar/shared/api'
import { readingTime } from '@scalar/shared/markdown'
import type { Episode } from '~/types/episode'
import { formatLongDate } from '~/utils/formatDate'

interface Props {
  lesson: LessonDetail
  episode: Episode
}

const props = defineProps<Props>()

const minutes = computed(() => readingTime(props.lesson.body))
const reviewedDate = computed(() => formatLongDate(props.lesson.lastReviewedAt))
</script>

<template>
  <header class="flex flex-col gap-4 border-b border-border pb-8 mb-8">
    <!-- Surtitre -->
    <div class="flex flex-wrap items-center gap-3">
      <UiTag tone="primary">
        Leçon
      </UiTag>
      <span class="text-xs font-medium text-text-muted">
        Chapitre {{ episode.chapter.number }} · {{ episode.chapter.title }} · épisode {{ episode.indexInChapter }} sur {{ episode.chapterEpisodeCount }}
      </span>
    </div>

    <!-- Titre H1 -->
    <h1 class="font-display text-3xl md:text-h1 font-bold text-text leading-tight">
      {{ lesson.title }}
    </h1>

    <!-- Chapeau -->
    <p v-if="lesson.summary" class="text-lg md:text-lede text-text-muted leading-relaxed">
      {{ lesson.summary }}
    </p>

    <!-- Métadonnées -->
    <div class="flex flex-wrap items-center gap-3 text-xs text-text-muted">
      <span v-if="reviewedDate">
        Relue le {{ reviewedDate }}
      </span>
      <span v-if="reviewedDate" aria-hidden="true">·</span>
      <span>
        {{ minutes }} min de lecture
      </span>
    </div>
  </header>
</template>
