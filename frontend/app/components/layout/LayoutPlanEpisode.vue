<script setup lang="ts">
// Épisode du plan (specs-site.md § 3.2) : icône d'état et titre ; l'épisode affiché
// est surligné et porte aria-current="page".
import type { Episode } from '~/types/episode'

interface Props {
  episode: Episode
  completed: boolean
  current: boolean
}

const { episode, completed, current } = defineProps<Props>()

const emit = defineEmits<{
  navigate: []
}>()
</script>

<template>
  <NuxtLink
    :to="episode.path"
    :aria-current="current ? 'page' : undefined"
    class="rounded-row text-meta flex items-center gap-2.25 py-1.5 pr-2 pl-10"
    :class="
      current ? 'bg-primary-soft text-primary font-semibold' : 'text-text hover:bg-surface-muted'
    "
    @click="emit('navigate')"
  >
    <Icon v-if="completed" name="lucide:circle-check" class="text-success size-3.5 shrink-0" />
    <Icon
      v-else-if="episode.kind === 'lesson'"
      name="lucide:book-open"
      class="text-primary size-3.5 shrink-0"
    />
    <Icon v-else name="lucide:code-xml" class="text-exercise size-3.5 shrink-0" />
    <span class="truncate">{{ episode.title }}</span>
  </NuxtLink>
</template>
