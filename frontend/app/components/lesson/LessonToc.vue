<script setup lang="ts">
import type { LessonHeading } from '@scalar/shared/api'

interface Props {
  headings: readonly LessonHeading[]
  activeId: string | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  select: [id: string]
}>()

const visible = computed(() => props.headings.length >= 2)
</script>

<template>
  <nav
    v-if="visible"
    aria-label="Sommaire de la leçon"
    class="hidden xl:flex flex-col gap-3 w-55 sticky top-24 self-start text-xs"
  >
    <span class="font-bold uppercase tracking-wider text-text-muted">
      Sur cette page
    </span>

    <ul class="flex flex-col gap-1 border-l border-border">
      <li v-for="h in headings" :key="h.id">
        <a
          :href="`#${h.id}`"
          class="block py-1 pl-3.5 -ml-px transition-colors truncate"
          :class="[
            activeId === h.id
              ? 'border-l-2 border-primary font-semibold text-primary'
              : 'text-text-muted hover:text-text',
          ]"
          @click.prevent="emit('select', h.id)"
        >
          {{ h.text }}
        </a>
      </li>
    </ul>
  </nav>
</template>
