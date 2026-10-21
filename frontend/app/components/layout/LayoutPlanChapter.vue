<script setup lang="ts">
import type { TrackViewChapter } from '@scalar/shared/api'
import type { Episode } from '~/types/episode'

const open = defineModel<boolean>({ default: false })

interface Props {
  chapter: TrackViewChapter
  episodes: readonly Episode[]
  completed: ReadonlySet<string>
  displayedKey: string | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  navigate: []
}>()

const isChapterComplete = computed(() => {
  if (props.episodes.length === 0) return false
  return props.episodes.every((e) => props.completed.has(e.key))
})

const hasCurrentEpisode = computed(() => {
  if (!props.displayedKey) return false
  return props.episodes.some((e) => e.key === props.displayedKey)
})

function toggle() {
  open.value = !open.value
}
</script>

<template>
  <div class="flex flex-col">
    <!-- En-tête de chapitre cliquable -->
    <button
      type="button"
      :aria-expanded="open"
      class="flex w-full items-center gap-2.5 rounded-[10px] px-2 py-2 text-left text-sm transition-colors cursor-pointer"
      :class="[
        hasCurrentEpisode ? 'bg-surface-muted font-semibold text-text' : 'text-text hover:bg-surface-muted/60',
      ]"
      @click="toggle"
    >
      <!-- Pastille numéro ou check -->
      <span
        class="flex size-[22px] shrink-0 items-center justify-center rounded-full text-xs font-semibold"
        :class="[
          isChapterComplete
            ? 'bg-success-soft text-success'
            : 'bg-surface-muted text-text-muted',
        ]"
      >
        <Icon v-if="isChapterComplete" name="lucide:check" class="size-3.5" />
        <span v-else>{{ chapter.number }}</span>
      </span>

      <!-- Titre du chapitre -->
      <span class="flex-1 truncate text-sm">{{ chapter.title }}</span>

      <!-- Chevron -->
      <Icon
        name="lucide:chevron-down"
        class="size-4 shrink-0 text-text-muted transition-transform duration-200"
        :class="{ 'rotate-180': open }"
      />
    </button>

    <!-- Liste des épisodes si ouvert -->
    <div v-show="open" class="flex flex-col gap-0.5 py-1">
      <LayoutPlanEpisode
        v-for="ep in episodes"
        :key="ep.key"
        :episode="ep"
        :completed="completed.has(ep.key)"
        :current="ep.key === displayedKey"
        @navigate="emit('navigate')"
      />
    </div>
  </div>
</template>
