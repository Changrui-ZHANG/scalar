<script setup lang="ts">
import { computed, ref } from 'vue'
import { useExercisePage } from '~/composables/useExercisePage'
import { useExerciseRun } from '~/composables/useExerciseRun'
import { useEpisodes } from '~/composables/useEpisodes'
import { useTryInSandbox } from '~/composables/useSandbox'
import { usePageSeo } from '~/composables/usePageSeo'
import { splitChecks } from '~/utils/verification'

definePageMeta({ layout: 'learning' })

const {
  exercise,
  track,
  episode,
  lessons,
  lessonsStatus,
  revealedHints,
  loadLessons,
  watchLessonTab,
  revealHint,
} = await useExercisePage()

const {
  code,
  draft,
  tab,
  resultTab,
  mobileTab,
  pending,
  execution,
  verification,
  passed,
  error,
  run,
  verify,
} = useExerciseRun(exercise, track)

const { next } = useEpisodes(track, computed(() => episode.value.key))
const tryInSandbox = useTryInSandbox()

watchLessonTab(computed(() => tab.value === 'lesson' || mobileTab.value === 'lesson'))

const currentChapter = computed(() =>
  track.value.chapters.find((c) => c.slug === episode.value.chapter.slug),
)
const hasLessons = computed(() => (currentChapter.value?.lessons.length ?? 0) > 0)

const split = computed(() =>
  splitChecks(
    verification.value,
    exercise.value.testCases,
    exercise.value.functionName,
    exercise.value.hiddenTestCaseCount,
  ),
)

const badge = computed(() => {
  if (!split.value.hasRun) return null
  return {
    passed: split.value.passedCaseCount,
    total: split.value.totalCaseCount,
  }
})

const codePanelRef = ref<{ insertAtCursor(text: string, cursorOffset?: number): void } | null>(null)

const MOBILE_TABS = [
  { id: 'instructions', label: 'Consigne', icon: 'lucide:file-text' },
  { id: 'lesson', label: 'Leçon', icon: 'lucide:book-open' },
  { id: 'code', label: 'Code', icon: 'lucide:code' },
  { id: 'result', label: 'Résultat', icon: 'lucide:check-square' },
] as const

const MOBILE_KEYS = [
  { label: '{ }', text: '{}', offset: 1 },
  { label: '( )', text: '()', offset: 1 },
  { label: '[ ]', text: '[]', offset: 1 },
  { label: '=>', text: '=> ', offset: 3 },
  { label: '" "', text: '""', offset: 1 },
  { label: 'Tab', text: '  ', offset: 2 },
] as const

function onMobileInsert(text: string, cursorOffset?: number) {
  codePanelRef.value?.insertAtCursor(text, cursorOffset)
}

usePageSeo({
  title: [exercise.value.title, episode.value.chapter.title, track.value.track.name],
  description: exercise.value.instructions.slice(0, 160),
  type: 'website',
})
</script>

<template>
  <div class="flex h-full w-full flex-col md:grid md:grid-cols-[500px_1fr] overflow-hidden pb-16 md:pb-0">
    <!-- Barre d'onglets mobile (< 768px) -->
    <div class="md:hidden border-b border-border bg-surface shrink-0">
      <div role="tablist" class="grid grid-cols-4">
        <button
          v-for="t in MOBILE_TABS"
          :key="t.id"
          type="button"
          role="tab"
          :aria-selected="mobileTab === t.id"
          class="flex flex-col items-center justify-center py-2 text-xs font-semibold cursor-pointer"
          :class="mobileTab === t.id ? 'text-primary border-b-2 border-primary -mb-px' : 'text-text-muted hover:text-text'"
          @click="mobileTab = (t.id as any)"
        >
          <div class="relative flex items-center justify-center">
            <Icon :name="t.icon" class="size-4" />
            <span
              v-if="t.id === 'result' && badge"
              class="absolute -top-1 -right-3 flex size-3.5 items-center justify-center rounded-full text-[9px] font-bold"
              :class="badge.passed === badge.total ? 'bg-success text-on-primary' : 'bg-danger text-on-primary'"
            >
              {{ badge.passed }}
            </span>
          </div>
          <span class="mt-1 text-[11px]">{{ t.label }}</span>
        </button>
      </div>

      <!-- Touches de code rapides sur mobile dans l'onglet Code -->
      <div
        v-if="mobileTab === 'code'"
        class="flex items-center gap-1.5 border-t border-border bg-surface-muted px-2 py-1.5 overflow-x-auto shrink-0"
      >
        <button
          v-for="k in MOBILE_KEYS"
          :key="k.label"
          type="button"
          class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[8px] border border-border bg-surface font-mono text-xs font-semibold text-text active:bg-surface-muted cursor-pointer"
          @click="onMobileInsert(k.text, k.offset)"
        >
          {{ k.label }}
        </button>
      </div>
    </div>

    <!-- Colonne Consigne (desktop : toujours visible à gauche ; mobile : visible sur onglets instructions ou lesson) -->
    <div
      class="flex-col h-full border-r border-border bg-surface overflow-hidden"
      :class="[
        mobileTab === 'instructions' || mobileTab === 'lesson' ? 'flex' : 'hidden md:flex',
      ]"
    >
      <div class="p-6 pb-2">
        <ExerciseHeader :exercise="exercise" :episode="episode" />
      </div>

      <!-- Onglets desktop / contenu -->
      <ExerciseTabs
        v-model="tab"
        :exercise="exercise"
        :verification="verification"
        :has-lessons="hasLessons"
        :revealed-hints="revealedHints"
      >
        <template #instructions>
          <ExerciseInstructions
            :instructions="exercise.instructions"
            :language="exercise.track.programmingLanguage"
            @try="tryInSandbox"
          />

          <!-- Indices inline sur mobile -->
          <div class="md:hidden">
            <ExerciseHints
              :hints="exercise.hints"
              :revealed="revealedHints"
              variant="inline"
              @reveal="revealHint"
            />
          </div>

          <ExerciseTestList
            :exercise="exercise"
            :verification="verification"
          />
        </template>

        <template #lesson>
          <ExerciseLessonTab
            :lessons="lessons"
            :status="lessonsStatus"
            :language="exercise.track.programmingLanguage"
            @try="tryInSandbox"
            @retry="loadLessons"
          />
        </template>

        <template #hints>
          <ExerciseHints
            :hints="exercise.hints"
            :revealed="revealedHints"
            variant="tab"
            @reveal="revealHint"
          />
        </template>
      </ExerciseTabs>
    </div>

    <!-- Colonne Code & Résultat (desktop : toujours visible à droite ; mobile : visible sur code ou result) -->
    <div
      class="flex-col h-full overflow-hidden bg-code-bg"
      :class="[
        mobileTab === 'code' || mobileTab === 'result' ? 'flex' : 'hidden md:flex',
      ]"
    >
      <!-- Un seul panneau de code partagé -->
      <div
        class="flex-1 overflow-hidden"
        :class="{ 'hidden md:block': mobileTab === 'result' }"
      >
        <ExerciseCodePanel
          ref="codePanelRef"
          v-model="code"
          :language="exercise.track.programmingLanguage ?? 'javascript'"
          :pending="pending"
          :draft-status="draft.status.value"
          :starter-changed="draft.starterChanged.value"
          :error="error"
          :actions="true"
          @run="run"
          @verify="verify"
          @reset="draft.reset"
        />
      </div>

      <!-- Panneau Résultat ou Bannière de réussite -->
      <div
        class="shrink-0"
        :class="{ 'hidden md:block': mobileTab === 'code' }"
      >
        <ExerciseSuccessBanner
          v-if="passed"
          :case-count="split.totalCaseCount"
          :next="next"
          :overview-path="`/parcours/${exercise.track.slug}`"
        />
        <ExerciseResultPanel
          v-else
          v-model:tab="resultTab"
          :exercise="exercise"
          :execution="execution"
          :verification="verification"
        />
      </div>
    </div>

    <!-- Barre mobile d'actions (< 768px) -->
    <ExerciseMobileBar
      :pending="pending"
      :passed="passed"
      :next="next"
      :overview-path="`/parcours/${exercise.track.slug}`"
      @run="run"
      @verify="verify"
    />
  </div>
</template>
