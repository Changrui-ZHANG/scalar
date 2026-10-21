<script setup lang="ts">
import type { ChapterLevel } from '@scalar/shared/enums'

const open = defineModel<boolean>({ default: false })

interface Props {
  level: ChapterLevel
  chapterCount: number
}

const props = defineProps<Props>()

const LEVEL_LABELS: Record<ChapterLevel, string> = {
  beginner: 'Débutant',
  intermediate: 'Intermédiaire',
  advanced: 'Avancé',
  ecosystem: 'Écosystème',
}

const label = computed(() => LEVEL_LABELS[props.level] ?? props.level)

function toggle() {
  open.value = !open.value
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <button
      type="button"
      :aria-expanded="open"
      class="flex w-full items-center justify-between py-2 text-left transition-colors cursor-pointer"
      @click="toggle"
    >
      <div class="flex items-baseline gap-3">
        <h2 class="font-display text-[21px] font-semibold text-text">
          {{ label }}
        </h2>
        <span class="text-xs text-text-muted">
          {{ chapterCount }} chapitre{{ chapterCount > 1 ? 's' : '' }}
        </span>
      </div>

      <Icon
        name="lucide:chevron-down"
        class="size-5 text-text-muted transition-transform duration-200"
        :class="{ 'rotate-180': open }"
      />
    </button>

    <div v-show="open" class="flex flex-col gap-3">
      <slot />
    </div>
  </div>
</template>
