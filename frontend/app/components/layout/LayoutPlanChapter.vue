<script setup lang="ts">
// Chapitre du plan (specs-site.md § 3.2) : pastille (numéro ou ✓) et titre ;
// ouvert, il liste ses épisodes.
import type { TrackViewChapter } from '@scalar/shared/api'
import type { Episode } from '~/types/episode'

// Ouvert ou fermé ; un chapitre absent de l'état du plan est fermé.
const open = defineModel<boolean>({ default: false })

interface Props {
  chapter: TrackViewChapter
  episodes: readonly Episode[] // épisodes de ce chapitre
  completed: ReadonlySet<string>
  displayedKey: string | null
}

const { chapter, episodes, completed, displayedKey } = defineProps<Props>()

const emit = defineEmits<{
  navigate: []
}>()

// Chapitre terminé : il a des épisodes et ils sont tous terminés.
const isCompleted = computed(() => {
  if (episodes.length === 0) return false
  for (const episode of episodes) {
    if (!completed.has(episode.key)) return false
  }
  return true
})

// Chapitre de l'épisode affiché : mis en valeur.
const isCurrent = computed(() => {
  for (const episode of episodes) {
    if (episode.key === displayedKey) return true
  }
  return false
})
</script>

<template>
  <div class="flex flex-col gap-1">
    <button
      type="button"
      :aria-expanded="open"
      class="rounded-row hover:bg-surface-muted flex w-full cursor-pointer items-center gap-2.5 px-2 py-1.75 text-left text-sm"
      :class="{
        'bg-surface-muted text-text font-semibold': isCurrent,
        'text-text font-medium': !isCurrent && isCompleted,
        'text-text-muted font-medium': !isCurrent && !isCompleted,
      }"
      @click="open = !open"
    >
      <span
        v-if="isCompleted"
        class="bg-success-soft flex size-5.5 shrink-0 items-center justify-center rounded-full"
      >
        <Icon name="lucide:check" class="text-success size-3" />
      </span>
      <span
        v-else
        class="bg-surface-muted text-text-muted flex size-5.5 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
      >
        {{ chapter.number }}
      </span>
      <span class="truncate">{{ chapter.title }}</span>
    </button>

    <div v-show="open" class="flex flex-col gap-1">
      <LayoutPlanEpisode
        v-for="episode in episodes"
        :key="episode.key"
        :episode="episode"
        :completed="completed.has(episode.key)"
        :current="episode.key === displayedKey"
        @navigate="emit('navigate')"
      />
    </div>
  </div>
</template>
