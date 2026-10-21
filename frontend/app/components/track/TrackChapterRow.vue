<script setup lang="ts">
import type { TrackViewChapter } from '@scalar/shared/api'
import type { Episode, TrackStatus } from '~/types/episode'

interface Props {
  chapter: TrackViewChapter
  status: TrackStatus
  current: boolean
  target: Episode | null
  showExercises: boolean
}

defineProps<Props>()
</script>

<template>
  <NuxtLink
    v-if="target"
    :id="`chapter-${chapter.slug}`"
    :to="target.path"
    class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[12px] border border-border p-4 transition-all hover:border-primary/50"
    :class="[
      current ? 'bg-primary-soft' : 'bg-surface hover:bg-surface-muted/40',
    ]"
  >
    <div class="flex items-center gap-3.5 min-w-0">
      <!-- Pastille numéro ou check -->
      <span
        class="flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
        :class="[
          status === 'completed'
            ? 'bg-success-soft text-success'
            : 'bg-surface-muted text-text-muted',
        ]"
      >
        <Icon v-if="status === 'completed'" name="lucide:check" class="size-4" />
        <span v-else>{{ chapter.number }}</span>
      </span>

      <div class="flex flex-col min-w-0">
        <h3 class="text-base font-semibold text-text truncate">
          {{ chapter.title }}
        </h3>
        <p v-if="chapter.summary" class="text-sm text-text-muted truncate">
          {{ chapter.summary }}
        </p>
      </div>
    </div>

    <!-- Compteurs et badge -->
    <div class="flex items-center gap-4 shrink-0 sm:pl-4">
      <div class="flex items-center gap-3 text-xs text-text-muted">
        <span class="flex items-center gap-1">
          <Icon name="lucide:book-open" class="size-3.5 text-primary" />
          {{ chapter.lessons.length }}
        </span>
        <span v-if="showExercises && chapter.exercises.length > 0" class="flex items-center gap-1">
          <Icon name="lucide:code-xml" class="size-3.5 text-exercise" />
          {{ chapter.exercises.length }}
        </span>
      </div>

      <UiTag v-if="status === 'completed'" tone="success">
        Terminé
      </UiTag>
      <UiTag v-else-if="status === 'in_progress'" tone="primary">
        En cours
      </UiTag>
    </div>
  </NuxtLink>
</template>
