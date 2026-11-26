<script setup lang="ts">
import { stripMarkdown } from '@scalar/shared/markdown'

definePageMeta({ layout: 'learning' })

const { lesson, track, episode } = await useLessonPage()
const { previous, next, completed } = useEpisodes(
  track,
  computed(() => episode.value.key),
)
const completion = useCompletion(track)
const tryInSandbox = useTryInSandbox()

const currentChapter = computed(() =>
  track.value.chapters.find((c) => c.slug === episode.value.chapter.slug),
)

const currentLessonInFil = computed(() =>
  currentChapter.value?.lessons.find((l) => l.slug === lesson.value.slug),
)

const headings = computed(() => currentLessonInFil.value?.headings ?? [])
const headingIds = computed(() => headings.value.map((h) => h.id))

const { activeId, scrollTo } = useActiveHeading(headingIds)

useEpisodeSeo({
  title: lesson.value.title,
  description: stripMarkdown(lesson.value.summary),
  trackName: track.value.track.name,
  trackSlug: track.value.track.slug,
  chapterTitle: episode.value.chapter.title,
  chapterSlug: episode.value.chapter.slug,
  dateModified: lesson.value.lastReviewedAt,
})

async function onContinue() {
  completion.complete(episode.value)
  const dest = next.value?.path ?? `/parcours/${track.value.track.slug}`
  await navigateTo(dest)
}
</script>

<template>
  <div class="mx-auto flex justify-center gap-12 px-4 py-8 pb-24 md:px-8 md:py-12 md:pb-16">
    <!-- Colonne article centré 680px -->
    <article class="w-full max-w-170">
      <LessonHeader :lesson="lesson" :episode="episode" />

      <LessonBody :lesson="lesson" @try="tryInSandbox" />

      <LessonNextCard :next="next" :completed="completed.has(episode.key)" @continue="onContinue" />
    </article>

    <!-- Rail droit « Sur cette page » (220px) -->
    <LessonToc :headings="headings" :active-id="activeId" @select="scrollTo" />

    <!-- Barre basse mobile -->
    <LessonMobileBar
      :previous="previous"
      :next="next"
      :completed="completed.has(episode.key)"
      @continue="onContinue"
    />
  </div>
</template>
