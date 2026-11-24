<script setup lang="ts">
// Un niveau repliable de la vue d'ensemble (specs-site.md § 5.2) : titre, nombre de
// chapitres, chevron ; les lignes de chapitres arrivent par le slot.
import type { ChapterLevel } from '@scalar/shared/enums'
import { CHAPTER_LEVEL_LABELS } from '@scalar/shared/labels'

const open = defineModel<boolean>({ required: true })

interface Props {
  level: ChapterLevel
  chapterCount: number
}

const { level, chapterCount } = defineProps<Props>()
</script>

<template>
  <section class="flex flex-col gap-2.5">
    <button
      type="button"
      :aria-expanded="open"
      class="flex w-full cursor-pointer items-center justify-between text-left"
      @click="open = !open"
    >
      <span class="flex items-baseline gap-2.5">
        <span class="font-display text-card text-text font-semibold">{{
          CHAPTER_LEVEL_LABELS[level]
        }}</span>
        <span class="text-text-muted text-sm">{{
          countLabel(chapterCount, 'chapitre', 'chapitres')
        }}</span>
      </span>
      <Icon v-if="open" name="lucide:chevron-up" class="text-text-muted size-4.5" />
      <Icon v-else name="lucide:chevron-down" class="text-text-muted size-4.5" />
    </button>

    <div
      v-show="open"
      class="divide-border rounded-tile border-border bg-surface divide-y overflow-hidden border"
    >
      <slot />
    </div>
  </section>
</template>
