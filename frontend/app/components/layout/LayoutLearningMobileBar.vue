<script setup lang="ts">
import type { Episode } from '~/types/episode'

interface Props {
  episode: Episode
  trackName: string
}

defineProps<Props>()

const emit = defineEmits<{
  togglePlan: []
  openSearch: []
}>()
</script>

<template>
  <div
    class="border-border bg-surface sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b px-3 md:hidden"
  >
    <!-- Bouton Plan (44x44) -->
    <button
      type="button"
      aria-label="Afficher le plan du parcours"
      class="text-text hover:bg-surface-muted rounded-row inline-flex size-11 cursor-pointer items-center justify-center"
      @click="emit('togglePlan')"
    >
      <Icon name="lucide:panel-left" class="size-5" />
    </button>

    <!-- Parcours · chapitre · rang, puis titre de l'épisode (aligné à gauche, comme la maquette) -->
    <div class="flex min-w-0 flex-1 flex-col px-1.5">
      <span class="text-text-muted max-w-full truncate text-xs">
        {{ trackName }} · {{ episode.chapter.title }} · {{ episode.indexInChapter }}/{{
          episode.chapterEpisodeCount
        }}
      </span>
      <span class="text-text max-w-full truncate text-sm font-semibold">
        {{ episode.title }}
      </span>
    </div>

    <!-- Recherche et Logo mobile -->
    <div class="flex items-center gap-1">
      <LayoutSearchButton @open-search="emit('openSearch')" />

      <NuxtLink
        to="/"
        aria-label="Accueil Scalar"
        class="text-text hover:bg-surface-muted rounded-row inline-flex size-11 items-center justify-center"
      >
        <LayoutLogoMark variant="mobile" class="size-5.5" />
      </NuxtLink>
    </div>
  </div>
</template>
