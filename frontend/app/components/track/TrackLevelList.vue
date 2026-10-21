<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import { CHAPTER_LEVELS } from '@scalar/shared/enums'
import type { ChapterLevel } from '@scalar/shared/enums'
import type { TrackView, TrackViewChapter } from '@scalar/shared/api'
import type { Episode, TrackProgress } from '~/types/episode'
import { chapterStatus, chapterTarget } from '~/utils/track'

interface Props {
  track: TrackView
  episodes: readonly Episode[]
  progress: TrackProgress
  completed: ReadonlySet<string>
  anchor: string | null
}

const props = defineProps<Props>()

const openLevels = ref<Record<string, boolean>>({})

function initLevels() {
  const currentLevel = props.progress.current?.chapter.level ?? 'beginner'
  let anchorLevel: ChapterLevel | null = null

  if (props.anchor) {
    const foundChapter = props.track.chapters.find((c) => c.slug === props.anchor)
    if (foundChapter) {
      anchorLevel = foundChapter.level
    }
  }

  for (const lvl of CHAPTER_LEVELS) {
    if (anchorLevel) {
      openLevels.value[lvl] = lvl === anchorLevel
    } else {
      openLevels.value[lvl] = lvl === currentLevel
    }
  }
}

watch(
  [() => props.anchor, () => props.progress.current],
  () => {
    initLevels()
  },
  { immediate: true },
)

onMounted(() => {
  if (props.anchor) {
    nextTick(() => {
      const el = document.getElementById(`chapter-${props.anchor}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
      }
    })
  }
})

function getChapters(lvl: ChapterLevel): TrackViewChapter[] {
  return props.track.chapters.filter((c) => c.level === lvl)
}
</script>

<template>
  <div class="flex flex-col gap-8">
    <template v-for="lvl in CHAPTER_LEVELS" :key="lvl">
      <TrackLevelSection
        v-if="getChapters(lvl).length > 0"
        v-model="openLevels[lvl]"
        :level="lvl"
        :chapter-count="getChapters(lvl).length"
      >
        <TrackChapterRow
          v-for="ch in getChapters(lvl)"
          :key="ch.slug"
          :chapter="ch"
          :status="chapterStatus(ch, episodes, completed)"
          :current="ch.slug === progress.current?.chapter.slug"
          :target="chapterTarget(ch.slug, episodes, completed)"
          :show-exercises="track.track.programmingLanguage !== null"
        />
      </TrackLevelSection>
    </template>
  </div>
</template>
