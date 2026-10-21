<script setup lang="ts">
import { computed } from 'vue'
import { useLessonPage } from '~/composables/useLessonPage'
import { useEpisodes } from '~/composables/useEpisodes'
import { useCompletion } from '~/composables/useCompletion'
import { useActiveHeading } from '~/composables/useActiveHeading'
import { useTryInSandbox } from '~/composables/useSandbox'
import { usePageSeo } from '~/composables/usePageSeo'

definePageMeta({ layout: 'learning' })

const { lesson, track, episode } = await useLessonPage()
const { previous, next, completed } = useEpisodes(track, computed(() => episode.value.key))
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

usePageSeo({
  title: [lesson.value.title, episode.value.chapter.title, track.value.track.name],
  description: lesson.value.summary,
  type: 'article',
})

async function onContinue() {
  completion.complete(episode.value)
  const dest = next.value?.path ?? `/parcours/${track.value.track.slug}`
  await navigateTo(dest)
}
</script>

<template>
  <div class="mx-auto flex justify-center gap-12 px-4 md:px-8 py-8 md:py-12 pb-24 md:pb-16">
    <!-- Colonne article centré 680px -->
    <article class="w-full max-w-170">
      <LessonHeader
        :lesson="lesson"
        :episode="episode"
      />

      <LessonBody
        :lesson="lesson"
        @try="tryInSandbox"
      />

      <LessonNextCard
        :next="next"
        :completed="completed.has(episode.key)"
        @continue="onContinue"
      />
    </article>

    <!-- Rail droit « Sur cette page » (220px) -->
    <LessonToc
      :headings="headings"
      :active-id="activeId"
      @select="scrollTo"
    />

    <!-- Barre basse mobile -->
    <LessonMobileBar
      :previous="previous"
      :next="next"
      :completed="completed.has(episode.key)"
      @continue="onContinue"
    />
  </div>
</template>
