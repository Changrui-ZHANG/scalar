<script setup lang="ts">
import type { ChapterLevel } from '@scalar/shared/enums'

const open = defineModel<boolean>({ default: false })

interface Props {
  level: ChapterLevel
}

const props = defineProps<Props>()

const LEVEL_LABELS: Record<ChapterLevel, string> = {
  beginner: 'DÉBUTANT',
  intermediate: 'INTERMÉDIAIRE',
  advanced: 'AVANCÉ',
  ecosystem: 'ÉCOSYSTÈME',
}

const label = computed(() => LEVEL_LABELS[props.level] ?? props.level)

function toggle() {
  open.value = !open.value
}
</script>

<template>
  <div class="flex flex-col border-b border-border/50 pb-2 mb-2 last:border-b-0 last:pb-0 last:mb-0">
    <button
      type="button"
      :aria-expanded="open"
      class="flex w-full items-center justify-between py-2 text-left text-xs font-bold uppercase tracking-wider text-text-muted hover:text-text cursor-pointer"
      @click="toggle"
    >
      <span>{{ label }}</span>
      <Icon
        name="lucide:chevron-down"
        class="size-3.5 transition-transform duration-200"
        :class="{ 'rotate-180': open }"
      />
    </button>

    <div v-show="open" class="flex flex-col gap-1 pt-1">
      <slot />
    </div>
  </div>
</template>
