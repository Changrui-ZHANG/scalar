<script setup lang="ts">
// Niveau repliable du plan (specs-site.md § 3.2) : « DÉBUTANT », « INTERMÉDIAIRE »…
import type { ChapterLevel } from '@scalar/shared/enums'
import { CHAPTER_LEVEL_LABELS } from '@scalar/shared/labels'

const open = defineModel<boolean>({ required: true })

interface Props {
  level: ChapterLevel
}

const { level } = defineProps<Props>()
</script>

<template>
  <div class="flex flex-col gap-1">
    <button
      type="button"
      :aria-expanded="open"
      class="text-text-muted hover:text-text flex w-full cursor-pointer items-center justify-between px-1 pt-2 pb-0.5 text-left text-xs font-bold tracking-wide uppercase"
      @click="open = !open"
    >
      {{ CHAPTER_LEVEL_LABELS[level] }}
      <Icon v-if="open" name="lucide:chevron-down" class="size-3.5" />
      <Icon v-else name="lucide:chevron-right" class="size-3.5" />
    </button>

    <div v-show="open" class="flex flex-col gap-1">
      <slot />
    </div>
  </div>
</template>
