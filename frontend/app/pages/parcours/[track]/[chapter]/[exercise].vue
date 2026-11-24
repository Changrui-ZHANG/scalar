<script setup lang="ts">
// Exercice (specs-site.md § 7). Desktop : colonne Consigne (500 px) et colonne Code.
// Mobile : quatre onglets ; un seul éditeur, montré ou caché selon l'onglet.
import { firstSentence } from '~/utils/seo'
import { caseCount } from '~/utils/verification'

definePageMeta({ layout: 'learning' })

const page = await useExercisePage()
const { exercise, track, episode, lessons, lessonsStatus, revealedHints } = page
const exerciseRun = useExerciseRun(exercise, track)
const { code, draft, tab, resultTab, mobileTab, pending, execution, verification, passed, error } =
  exerciseRun
const { next } = useEpisodes(track, () => episode.value.key)
const tryInSandbox = useTryInSandbox()

page.watchLessonTab(() => tab.value === 'lesson')

const hasLessons = computed(() =>
  track.value.chapters.some((c) => c.slug === episode.value.chapter.slug && c.lessons.length > 0),
)
const badge = computed(() => (verification.value ? caseCount(verification.value) : null))
const codePanel = ref<{ insertAtCursor(text: string, cursorOffset?: number): void } | null>(null)
const overviewPath = computed(() => `/parcours/${track.value.track.slug}`)

usePageSeo({
  title: [exercise.value.title, episode.value.chapter.title, track.value.track.name],
  description: firstSentence(exercise.value.instructions),
  type: 'article',
})
</script>

<template>
  <div class="flex h-full flex-col md:flex-row">
    <ExerciseMobileTabs v-model="mobileTab" :badge="badge" />

    <section
      class="md:border-border min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4.5 md:flex md:w-125 md:flex-none md:border-r md:px-7 md:py-6"
      :class="mobileTab === 'instructions' || mobileTab === 'lesson' ? 'flex' : 'hidden'"
    >
      <ExerciseHeader :exercise="exercise" :episode="episode" />
      <ExerciseTabs
        v-model="tab"
        :exercise="exercise"
        :verification="verification"
        :has-lessons="hasLessons"
        :revealed-hints="revealedHints"
      >
        <template #instructions>
          <div class="flex flex-col gap-3.5">
            <ExerciseInstructions
              :instructions="exercise.instructions"
              :language="exercise.track.programmingLanguage"
              @try="tryInSandbox"
            />
            <ExerciseTestList :exercise="exercise" :verification="verification" />
            <ExerciseHints
              class="md:hidden"
              :hints="exercise.hints"
              :revealed="revealedHints"
              variant="inline"
              @reveal="page.revealHint"
            />
          </div>
        </template>
        <template #lesson>
          <ExerciseLessonTab
            :lessons="lessons"
            :status="lessonsStatus"
            :language="exercise.track.programmingLanguage"
            @try="tryInSandbox"
            @retry="page.loadLessons"
          />
        </template>
        <template #hints>
          <ExerciseHints
            :hints="exercise.hints"
            :revealed="revealedHints"
            @reveal="page.revealHint"
          />
        </template>
      </ExerciseTabs>
    </section>

    <section
      class="min-h-0 flex-1 flex-col gap-3.5 p-2.5 md:flex md:px-6 md:py-5"
      :class="mobileTab === 'code' || mobileTab === 'result' ? 'flex' : 'hidden'"
    >
      <ExerciseCodePanel
        ref="codePanel"
        v-model="code"
        :class="mobileTab === 'result' ? 'max-md:hidden' : ''"
        :language="exercise.track.programmingLanguage ?? 'javascript'"
        :pending="pending"
        :draft-status="draft.status.value"
        :starter-changed="draft.starterChanged.value"
        :error="error"
        @run="exerciseRun.run"
        @verify="exerciseRun.verify"
        @reset="draft.reset"
      />
      <div class="flex-col gap-3.5 md:flex" :class="mobileTab === 'result' ? 'flex' : 'hidden'">
        <ExerciseSuccessBanner
          v-if="passed"
          :case-count="badge?.total ?? 0"
          :next="next"
          :overview-path="overviewPath"
        />
        <ExerciseResultPanel
          v-else
          v-model:tab="resultTab"
          :exercise="exercise"
          :execution="execution"
          :verification="verification"
        />
      </div>
    </section>

    <ExerciseMobileKeys
      v-if="mobileTab === 'code'"
      @insert="(text, offset) => codePanel?.insertAtCursor(text, offset)"
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
