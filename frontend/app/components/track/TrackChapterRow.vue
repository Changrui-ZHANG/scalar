<script setup lang="ts">
// Ligne de chapitre de la vue d'ensemble (specs-site.md § 5.2).
// Clic : premier épisode non terminé du chapitre, sinon son premier épisode.
import { stripMarkdown } from '@scalar/shared/markdown'
import type { TrackViewChapter } from '@scalar/shared/api'
import type { Episode, TrackStatus } from '~/types/episode'

interface Props {
  chapter: TrackViewChapter
  status: TrackStatus
  current: boolean // chapitre de l'épisode courant : fond primary-soft
  target: Episode | null
  showExercises: boolean // faux pour un parcours sans langage
}

const { chapter, status, current, target, showExercises } = defineProps<Props>()

// Le résumé peut contenir du Markdown : on n'en garde que le texte, sur une ligne.
const summary = computed(() => stripMarkdown(chapter.summary))
</script>

<template>
  <NuxtLink
    v-if="target"
    :id="chapter.slug"
    :to="target.path"
    class="hover:bg-surface-muted flex scroll-mt-24 items-center gap-3.5 px-4.5 py-3.5"
    :class="current ? 'bg-primary-soft' : ''"
  >
    <span
      v-if="status === 'completed'"
      class="bg-success-soft flex size-7 shrink-0 items-center justify-center rounded-full"
    >
      <Icon name="lucide:check" class="text-success size-3.5" />
    </span>
    <span
      v-else
      class="bg-surface-muted text-tag text-text-muted flex size-7 shrink-0 items-center justify-center rounded-full font-semibold"
    >
      {{ chapter.number }}
    </span>

    <span class="flex min-w-0 flex-1 flex-col">
      <span class="text-text truncate text-base font-semibold">{{ chapter.title }}</span>
      <span v-if="summary" class="text-text-muted truncate text-sm">{{ summary }}</span>
    </span>

    <span class="text-small text-text-muted hidden shrink-0 items-center gap-3.5 sm:flex">
      <span class="flex items-center gap-1.25">
        <Icon name="lucide:book-open" class="text-primary size-3.5" />
        {{ chapter.lessons.length }}
      </span>
      <span v-if="showExercises && chapter.exercises.length > 0" class="flex items-center gap-1.25">
        <Icon name="lucide:code-xml" class="text-exercise size-3.5" />
        {{ chapter.exercises.length }}
      </span>
    </span>

    <span class="text-meta w-17.5 shrink-0 text-right font-semibold">
      <span v-if="status === 'completed'" class="text-success">Terminé</span>
      <span v-else-if="status === 'in_progress'" class="text-primary">En cours</span>
      <span v-else-if="!chapter.free" class="text-text-muted inline-flex items-center gap-1">
        <Icon name="lucide:lock" class="size-3" />
        Premium
      </span>
    </span>
  </NuxtLink>
</template>
