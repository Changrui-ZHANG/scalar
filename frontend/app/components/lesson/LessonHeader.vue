<script setup lang="ts">
import type { LessonDetail } from '@scalar/shared/api'
import { readingTime, stripMarkdown } from '@scalar/shared/markdown'
import type { Episode } from '~/types/episode'
import { formatLongDate } from '~/utils/formatDate'

interface Props {
  lesson: LessonDetail
  episode: Episode
}

const props = defineProps<Props>()

const minutes = computed(() => readingTime(props.lesson.body))
// Le chapeau est du texte simple : on retire le Markdown éventuel (`const` → const).
const summary = computed(() => stripMarkdown(props.lesson.summary))
const reviewedDate = computed(() => formatLongDate(props.lesson.lastReviewedAt))
</script>

<template>
  <header class="border-border mb-8 flex flex-col gap-4 border-b pb-8">
    <!-- Surtitre -->
    <div class="flex flex-wrap items-center gap-3">
      <UiTag tone="primary"> Leçon </UiTag>
      <span class="text-small text-text-muted">
        Chapitre {{ episode.chapter.number }} · {{ episode.chapter.title }} · épisode
        {{ episode.indexInChapter }} sur {{ episode.chapterEpisodeCount }}
      </span>
    </div>

    <!-- Titre H1 -->
    <h1
      class="font-display md:text-h1 text-text text-3xl leading-tight font-semibold tracking-tight"
    >
      {{ lesson.title }}
    </h1>

    <!-- Chapeau -->
    <p v-if="summary" class="md:text-lede text-text-muted text-lg leading-relaxed">
      {{ summary }}
    </p>

    <!-- Métadonnées -->
    <div class="text-meta text-text-muted flex flex-wrap items-center gap-3">
      <span v-if="reviewedDate"> Relue le {{ reviewedDate }} </span>
      <span v-if="reviewedDate" aria-hidden="true">·</span>
      <span> {{ minutes }} min de lecture </span>
    </div>
  </header>
</template>
