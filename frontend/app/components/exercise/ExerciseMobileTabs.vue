<script setup lang="ts">
// Les quatre onglets de l'exercice sur mobile (specs-site.md § 7.4) :
// Consigne, Leçon, Code, Résultat (avec la pastille « n/m » après une vérification).
import type { VerificationResult } from '@scalar/shared/api'
import type { MobileExerciseTab } from '~/types/exercise'
import { caseCount } from '~/utils/verification'

const tab = defineModel<MobileExerciseTab>({ required: true })

interface Props {
  verification: VerificationResult | null // dernière vérification : pastille « n/m » de Résultat
}

const props = defineProps<Props>()

const badge = computed(() => (props.verification ? caseCount(props.verification) : null))

const tabs: { id: MobileExerciseTab; label: string }[] = [
  { id: 'instructions', label: 'Consigne' },
  { id: 'lesson', label: 'Leçon' },
  { id: 'code', label: 'Code' },
  { id: 'result', label: 'Résultat' },
]
</script>

<template>
  <div
    role="tablist"
    aria-label="Exercice"
    class="border-border bg-surface grid shrink-0 grid-cols-4 border-b px-1.5 md:hidden"
  >
    <button
      v-for="item in tabs"
      :key="item.id"
      type="button"
      role="tab"
      :aria-selected="tab === item.id"
      class="text-small -mb-px flex min-h-11 cursor-pointer items-center justify-center gap-1.25 border-b-2"
      :class="
        tab === item.id
          ? 'border-primary text-text font-semibold'
          : 'text-text-muted border-transparent'
      "
      @click="tab = item.id"
    >
      {{ item.label }}
      <span
        v-if="item.id === 'result' && badge"
        class="rounded-full px-1.5 py-px text-xs font-semibold"
        :class="
          badge.passed === badge.total
            ? 'bg-success-soft text-success'
            : 'bg-danger-soft text-danger'
        "
      >
        {{ badge.passed }}/{{ badge.total }}
      </span>
    </button>
  </div>
</template>
