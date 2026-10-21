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
  <div class="md:hidden sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-border bg-surface px-3">
    <!-- Bouton Plan (44x44) -->
    <button
      type="button"
      aria-label="Afficher le plan du parcours"
      class="inline-flex size-11 items-center justify-center rounded-[10px] text-text hover:bg-surface-muted cursor-pointer"
      @click="emit('togglePlan')"
    >
      <Icon name="lucide:panel-left" class="size-5" />
    </button>

    <!-- Titre et fil au centre -->
    <div class="flex flex-1 flex-col items-center justify-center px-2 min-w-0">
      <span class="text-xs text-text-muted truncate max-w-full">
        {{ trackName }} · {{ episode.chapter.title }} · {{ episode.indexInChapter }}/{{ episode.chapterEpisodeCount }}
      </span>
      <span class="text-sm font-semibold text-text truncate max-w-full">
        {{ episode.title }}
      </span>
    </div>

    <!-- Recherche et Logo mobile -->
    <div class="flex items-center gap-1">
      <LayoutSearchButton @open-search="emit('openSearch')" />

      <NuxtLink
        to="/"
        aria-label="Accueil Scalar"
        class="inline-flex size-11 items-center justify-center rounded-[10px] text-text hover:bg-surface-muted"
      >
        <img src="/logo-mobile.svg" alt="" width="22" height="22" class="size-[22px] text-primary">
      </NuxtLink>
    </div>
  </div>
</template>
