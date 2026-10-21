<script setup lang="ts">
import type { PublicExercise, VerificationResult } from '@scalar/shared/api'
import type { ExerciseTab } from '~/types/exercise'
import { splitChecks } from '~/utils/verification'

const tab = defineModel<ExerciseTab>({ required: true })

interface Props {
  exercise: PublicExercise
  verification: VerificationResult | null
  hasLessons: boolean
  revealedHints: number
}

const props = defineProps<Props>()

const tabList = computed(() => {
  const list: { id: ExerciseTab; label: string; icon: string }[] = [
    { id: 'instructions', label: 'Consigne', icon: 'lucide:file-text' },
  ]
  if (props.hasLessons) {
    list.push({ id: 'lesson', label: 'Leçon', icon: 'lucide:book-open' })
  }
  if (props.exercise.hints && props.exercise.hints.length > 0) {
    list.push({
      id: 'hints',
      label: `Indices · ${props.revealedHints}/${props.exercise.hints.length}`,
      icon: 'lucide:lightbulb',
    })
  }
  return list
})

const split = computed(() =>
  splitChecks(
    props.verification,
    props.exercise.testCases,
    props.exercise.functionName,
    props.exercise.hiddenTestCaseCount,
  ),
)
</script>

<template>
  <div class="flex flex-1 flex-col overflow-hidden">
    <!-- Onglets -->
    <div role="tablist" class="flex border-b border-border bg-surface px-6 gap-6 shrink-0">
      <button
        v-for="t in tabList"
        :key="t.id"
        type="button"
        role="tab"
        :aria-selected="tab === t.id"
        class="relative flex items-center gap-2 py-3 text-sm font-semibold transition-colors cursor-pointer"
        :class="[
          tab === t.id
            ? 'text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary'
            : 'text-text-muted hover:text-text',
        ]"
        @click="tab = t.id"
      >
        <Icon :name="t.icon" class="size-4 shrink-0" />
        <span>{{ t.label }}</span>
      </button>
    </div>

    <!-- Contenu de l'onglet actif -->
    <div class="flex-1 overflow-y-auto px-6 py-4">
      <div v-show="tab === 'instructions'">
        <slot name="instructions" />
      </div>
      <div v-show="tab === 'lesson'">
        <slot name="lesson" />
      </div>
      <div v-show="tab === 'hints'">
        <slot name="hints" />
      </div>
    </div>

    <!-- Bandeau bas (quand onglet ≠ consigne et après vérification) -->
    <div
      v-if="tab !== 'instructions' && split.hasRun"
      class="border-t border-border p-3 flex items-center justify-between text-xs shrink-0"
      :class="[
        split.passed ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger',
      ]"
    >
      <span class="font-semibold">
        Tests : {{ split.passedCaseCount }} cas sur {{ split.totalCaseCount }} réussis
      </span>
      <button
        type="button"
        class="font-semibold underline cursor-pointer"
        @click="tab = 'instructions'"
      >
        Voir la consigne →
      </button>
    </div>
  </div>
</template>
