<script setup lang="ts">
// Onglets de la colonne Consigne (specs-site.md § 7.1) : Consigne, Leçon, Indices.
// Sur mobile, la barre d'onglets est cachée : ce sont les onglets mobiles qui choisissent.
import type { PublicExercise, VerificationResult } from '@scalar/shared/api'
import type { ExerciseTab } from '~/types/exercise'
import { caseCount } from '~/utils/verification'

const tab = defineModel<ExerciseTab>({ required: true })

interface Props {
  exercise: PublicExercise
  verification: VerificationResult | null
  hasLessons: boolean
  revealedHints: number
}

const { exercise, verification, hasLessons, revealedHints } = defineProps<Props>()

// Onglets affichés : Leçon et Indices seulement s'ils ont du contenu.
const tabs = computed(() => {
  const list: { id: ExerciseTab; label: string; icon: string }[] = []
  list.push({ id: 'instructions', label: 'Consigne', icon: 'lucide:list-checks' })
  if (hasLessons) {
    list.push({ id: 'lesson', label: 'Leçon', icon: 'lucide:book-open' })
  }
  if (exercise.hints.length > 0) {
    list.push({
      id: 'hints',
      label: `Indices · ${revealedHints}/${exercise.hints.length}`,
      icon: 'lucide:lightbulb',
    })
  }
  return list
})

// Bandeau bas : seulement hors de l'onglet Consigne, après une vérification.
const summary = computed(() => {
  if (tab.value === 'instructions' || !verification) return null
  const count = caseCount(verification)
  return { passed: verification.passed, passedCount: count.passed, total: count.total }
})
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col gap-4">
    <div role="tablist" class="border-border hidden gap-5.5 border-b md:flex">
      <button
        v-for="item in tabs"
        :id="`exercise-tab-${item.id}`"
        :key="item.id"
        type="button"
        role="tab"
        :aria-selected="tab === item.id"
        :aria-controls="`exercise-panel-${item.id}`"
        class="text-ui -mb-px flex cursor-pointer items-center gap-1.5 border-b-2 pt-2 pb-2.5"
        :class="
          tab === item.id
            ? 'border-primary text-text font-semibold'
            : 'text-text-muted hover:text-text border-transparent font-medium'
        "
        @click="tab = item.id"
      >
        <Icon :name="item.icon" class="size-3.5" :class="tab === item.id ? 'text-primary' : ''" />
        {{ item.label }}
      </button>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto">
      <div v-show="tab === 'instructions'" id="exercise-panel-instructions" role="tabpanel">
        <slot name="instructions" />
      </div>
      <div v-show="tab === 'lesson'" id="exercise-panel-lesson" role="tabpanel">
        <slot name="lesson" />
      </div>
      <div v-show="tab === 'hints'" id="exercise-panel-hints" role="tabpanel">
        <slot name="hints" />
      </div>
    </div>

    <div
      v-if="summary"
      class="rounded-control hidden items-center justify-between px-3.5 py-3 text-sm font-semibold md:flex"
      :class="summary.passed ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'"
    >
      <span class="flex items-center gap-2">
        <Icon v-if="summary.passed" name="lucide:circle-check" class="size-4" />
        <Icon v-else name="lucide:circle-x" class="size-4" />
        Tests : {{ summary.passedCount }} cas sur {{ summary.total }} réussis
      </span>
      <button
        type="button"
        class="text-meta flex cursor-pointer items-center gap-1"
        @click="tab = 'instructions'"
      >
        Voir la consigne
        <Icon name="lucide:arrow-right" class="size-3.5" />
      </button>
    </div>
  </div>
</template>
