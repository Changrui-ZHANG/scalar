<script setup lang="ts">
// Exercice (specs-site.md § 7). Desktop : colonne Consigne (500 px) et colonne Code.
// Mobile : quatre onglets ; un seul éditeur, montré ou caché selon l'onglet.
import { firstSentence } from '~/utils/seo'

definePageMeta({ layout: 'learning' })

const page = await useExercisePage()
const { exercise, track, episode, hasLessons, overviewPath } = page
const { lessons, lessonsStatus, revealedHints } = page
const exerciseRun = useExerciseRun(exercise, track)
const { code, draft, tab, resultTab, mobileTab, pending, execution, verification, passed, error } =
  exerciseRun
const { next } = useEpisodes(track, () => episode.value.key)
const tryInSandbox = useTryInSandbox()

page.watchLessonTab(() => tab.value === 'lesson')

useEpisodeSeo({
  title: exercise.value.title,
  description: firstSentence(exercise.value.instructions),
  trackName: track.value.track.name,
  trackSlug: track.value.track.slug,
  chapterTitle: episode.value.chapter.title,
  chapterSlug: episode.value.chapter.slug,
  dateModified: null,
})
</script>

<template>
  <div class="flex h-full flex-col md:flex-row">
    <ExerciseMobileTabs v-model="mobileTab" :verification="verification" />

    <ExerciseBrief
      v-model="tab"
      :class="mobileTab === 'instructions' || mobileTab === 'lesson' ? 'flex' : 'max-md:hidden'"
      :exercise="exercise"
      :episode="episode"
      :verification="verification"
      :has-lessons="hasLessons"
      :revealed-hints="revealedHints"
      :lessons="lessons"
      :lessons-status="lessonsStatus"
      @try="tryInSandbox"
      @reveal="page.revealHint"
      @retry-lessons="page.loadLessons"
    />

    <ExerciseWorkspace
      v-model:code="code"
      v-model:result-tab="resultTab"
      :class="mobileTab === 'code' || mobileTab === 'result' ? 'flex' : 'max-md:hidden'"
      :exercise="exercise"
      :mobile-tab="mobileTab"
      :pending="pending"
      :draft-status="draft.status.value"
      :starter-changed="draft.starterChanged.value"
      :error="error"
      :execution="execution"
      :verification="verification"
      :passed="passed"
      :next="next"
      :overview-path="overviewPath"
      @run="exerciseRun.run"
      @verify="exerciseRun.verify"
      @reset="draft.reset"
    />
    <ExerciseMobileBar
      :pending="pending"
      :passed="passed"
      :next="next"
      :overview-path="overviewPath"
      @run="exerciseRun.run"
      @verify="exerciseRun.verify"
    />
  </div>
</template>
