<script setup lang="ts">
// Colonne Consigne de l'exercice (specs-site.md § 7.1) : en-tête, onglets Consigne /
// Leçon / Indices et leur contenu. Sur mobile, elle sert aux onglets Consigne et Leçon.
import type { LessonDetail, PublicExercise, VerificationResult } from '@scalar/shared/api'
import type { ProgrammingLanguage } from '@scalar/shared/enums'
import type { Episode } from '~/types/episode'
import type { ExerciseTab } from '~/types/exercise'

const tab = defineModel<ExerciseTab>({ required: true })

interface Props {
  exercise: PublicExercise
  episode: Episode
  verification: VerificationResult | null
  hasLessons: boolean
  revealedHints: number
  lessons: readonly LessonDetail[] | null
  lessonsStatus: 'idle' | 'pending' | 'ready' | 'error'
}

const { exercise, episode, verification, hasLessons, revealedHints, lessons, lessonsStatus } =
  defineProps<Props>()

const emit = defineEmits<{
  try: [code: string, language: ProgrammingLanguage]
  reveal: []
  retryLessons: []
}>()
</script>

<template>
  <section
    class="md:border-border flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4.5 md:w-125 md:flex-none md:border-r md:px-7 md:py-6"
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
            @try="(code, language) => emit('try', code, language)"
          />
          <ExerciseTestList :exercise="exercise" :verification="verification" />
          <!-- Sur mobile, les indices sont dans la consigne (pas d'onglet Indices) -->
          <ExerciseHints
            class="md:hidden"
            :hints="exercise.hints"
            :revealed="revealedHints"
            variant="inline"
            @reveal="emit('reveal')"
          />
        </div>
      </template>
      <template #lesson>
        <ExerciseLessonTab
          :lessons="lessons"
          :status="lessonsStatus"
          :language="exercise.track.programmingLanguage"
          @try="(code, language) => emit('try', code, language)"
          @retry="emit('retryLessons')"
        />
      </template>
      <template #hints>
        <ExerciseHints :hints="exercise.hints" :revealed="revealedHints" @reveal="emit('reveal')" />
      </template>
    </ExerciseTabs>
  </section>
</template>
