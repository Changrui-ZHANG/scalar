<script setup lang="ts">
import { ref, watch } from 'vue'
import { CHAPTER_LEVELS } from '@scalar/shared/enums'
import type { ChapterLevel } from '@scalar/shared/enums'
import type { TrackView, TrackViewChapter } from '@scalar/shared/api'
import type { Episode, TrackProgress } from '~/types/episode'

interface Props {
  track: TrackView
  episodes: readonly Episode[]
  progress: TrackProgress
  completed: ReadonlySet<string>
  displayedKey: string | null
  collapsed: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  collapse: []
  expand: []
  navigate: []
}>()

// État ouvert/fermé de chaque niveau
const openLevels = ref<Record<string, boolean>>({})
// État ouvert/fermé de chaque chapitre
const openChapters = ref<Record<string, boolean>>({})

function initActiveState() {
  const currentEp = props.episodes.find((e) => e.key === props.displayedKey)
  const currentChapterSlug = currentEp?.chapter.slug
  const currentLevel = currentEp?.chapter.level

  for (const lvl of CHAPTER_LEVELS) {
    if (currentLevel) {
      openLevels.value[lvl] = lvl === currentLevel
    } else {
      // Si aucun épisode courant, ouvrir le premier niveau qui a des chapitres
      openLevels.value[lvl] = lvl === 'beginner'
    }
  }

  for (const ch of props.track.chapters) {
    if (currentChapterSlug) {
      openChapters.value[ch.slug] = ch.slug === currentChapterSlug
    } else {
      openChapters.value[ch.slug] = false
    }
  }
}

watch(
  () => props.displayedKey,
  () => {
    initActiveState()
  },
  { immediate: true },
)

function getChaptersForLevel(level: ChapterLevel): TrackViewChapter[] {
  return props.track.chapters.filter((c) => c.level === level)
}

function getEpisodesForChapter(chapterSlug: string): Episode[] {
  return props.episodes.filter((e) => e.chapter.slug === chapterSlug)
}
</script>

<template>
  <!-- Rail replié sur desktop (48px) -->
  <aside
    v-if="collapsed"
    class="hidden xl:flex h-full w-12 flex-col items-center border-r border-border bg-surface py-3"
  >
    <button
      type="button"
      aria-label="Déplier le plan du parcours"
      class="inline-flex size-9 items-center justify-center rounded-[10px] text-text hover:bg-surface-muted cursor-pointer"
      @click="emit('expand')"
    >
      <Icon name="lucide:panel-left" class="size-5" />
    </button>
  </aside>

  <!-- Plan complet 280px -->
  <aside
    v-else
    class="flex h-full w-70 flex-col bg-surface p-[18px_16px] text-text"
  >
    <!-- En-tête : Titre du parcours + Bouton replier -->
    <div class="mb-3 flex items-start justify-between gap-2">
      <NuxtLink
        :to="`/parcours/${track.track.slug}`"
        class="font-display text-lg font-bold text-text hover:text-primary transition-colors leading-tight truncate"
      >
        {{ track.track.name }}
      </NuxtLink>
      <button
        type="button"
        aria-label="Replier le plan"
        class="hidden xl:inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-text-muted hover:bg-surface-muted hover:text-text cursor-pointer"
        @click="emit('collapse')"
      >
        <Icon name="lucide:panel-left-close" class="size-4" />
      </button>
    </div>

    <!-- Barre de progression -->
    <div class="mb-4 flex flex-col gap-1.5">
      <UiProgressBar
        :value="progress.percent"
        :label="`Progression du parcours ${track.track.name}`"
      />
      <span class="text-[13px] text-text-muted">
        {{ progress.done }} épisodes sur {{ progress.total }} · {{ progress.percent }} %
      </span>
    </div>

    <!-- Niveaux et chapitres avec défilement interne -->
    <div class="flex-1 overflow-y-auto pr-1">
      <template v-for="lvl in CHAPTER_LEVELS" :key="lvl">
        <LayoutPlanLevel
          v-if="getChaptersForLevel(lvl).length > 0"
          v-model="openLevels[lvl]"
          :level="lvl"
        >
          <LayoutPlanChapter
            v-for="ch in getChaptersForLevel(lvl)"
            :key="ch.slug"
            v-model="openChapters[ch.slug]"
            :chapter="ch"
            :episodes="getEpisodesForChapter(ch.slug)"
            :completed="completed"
            :displayed-key="displayedKey"
            @navigate="emit('navigate')"
          />
        </LayoutPlanLevel>
      </template>
    </div>
  </aside>
</template>
