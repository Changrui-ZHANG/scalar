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

// État ouvert/fermé de chaque niveau ; au départ tous fermés (initActiveState ouvre le bon).
const openLevels = ref<Record<ChapterLevel, boolean>>({
  beginner: false,
  intermediate: false,
  advanced: false,
  ecosystem: false,
})
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
  <!-- Plan replié (desktop) : un rail de 48 px avec le bouton qui le rouvre -->
  <aside
    v-if="collapsed"
    class="border-border bg-surface hidden h-full w-12 flex-col items-center border-r py-3 xl:flex"
  >
    <UiIconButton
      icon="lucide:panel-left"
      label="Déplier le plan du parcours"
      @click="emit('expand')"
    />
  </aside>

  <aside v-else class="bg-surface text-text flex h-full w-70 flex-col gap-3 px-4 py-4.5">
    <div class="flex flex-col gap-2">
      <div class="flex items-center justify-between gap-2 pr-8 xl:pr-0">
        <NuxtLink
          :to="`/parcours/${track.track.slug}`"
          class="font-display text-text hover:text-primary truncate text-lg font-semibold"
        >
          {{ track.track.name }}
        </NuxtLink>
        <button
          type="button"
          aria-label="Replier le plan"
          class="text-text-muted hover:bg-surface-muted hidden size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg xl:inline-flex"
          @click="emit('collapse')"
        >
          <Icon name="lucide:panel-left-close" class="size-4.5" />
        </button>
      </div>
      <UiProgressBar
        :value="progress.percent"
        :label="`Progression du parcours ${track.track.name}`"
      />
      <p class="text-tag text-text-muted">
        {{ countLabel(progress.done, 'épisode', 'épisodes') }} sur {{ progress.total }} ·
        {{ progress.percent }} %
      </p>
    </div>

    <!-- Défilement interne quand le plan dépasse la hauteur de l'écran -->
    <nav
      aria-label="Plan du parcours"
      class="-mx-1 flex flex-1 flex-col gap-1 overflow-y-auto px-1"
    >
      <template v-for="level in CHAPTER_LEVELS" :key="level">
        <LayoutPlanLevel
          v-if="getChaptersForLevel(level).length > 0"
          v-model="openLevels[level]"
          :level="level"
        >
          <LayoutPlanChapter
            v-for="chapter in getChaptersForLevel(level)"
            :key="chapter.slug"
            v-model="openChapters[chapter.slug]"
            :chapter="chapter"
            :episodes="getEpisodesForChapter(chapter.slug)"
            :completed="completed"
            :displayed-key="displayedKey"
            @navigate="emit('navigate')"
          />
        </LayoutPlanLevel>
      </template>
    </nav>
  </aside>
</template>
