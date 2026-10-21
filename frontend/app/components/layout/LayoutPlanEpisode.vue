<script setup lang="ts">
import type { Episode } from '~/types/episode'

interface Props {
  episode: Episode
  completed: boolean
  current: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  navigate: []
}>()

const iconName = computed(() => {
  if (props.completed) return 'lucide:circle-check'
  return props.episode.kind === 'lesson' ? 'lucide:book-open' : 'lucide:code-xml'
})

const iconClass = computed(() => {
  if (props.completed) return 'text-success'
  return props.episode.kind === 'lesson' ? 'text-primary' : 'text-exercise'
})
</script>

<template>
  <NuxtLink
    :to="episode.path"
    :aria-current="current ? 'page' : undefined"
    class="flex items-center gap-2.5 py-1.5 pl-10 pr-3 rounded-[8px] text-[13px] transition-colors"
    :class="[
      current
        ? 'bg-primary-soft text-primary font-semibold'
        : 'text-text hover:bg-surface-muted hover:text-text',
    ]"
    @click="emit('navigate')"
  >
    <Icon :name="iconName" class="size-3.5 shrink-0" :class="iconClass" />
    <span class="truncate">{{ episode.title }}</span>
  </NuxtLink>
</template>
