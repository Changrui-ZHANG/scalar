<script setup lang="ts">
import type { ExecutionResult, PublicExercise, VerificationResult } from '@scalar/shared/api'
import type { ResultTab } from '~/types/exercise'
import { splitChecks } from '~/utils/verification'

const tab = defineModel<ResultTab>('tab', { default: 'tests' })

interface Props {
  exercise: PublicExercise
  execution: ExecutionResult | null
  verification: VerificationResult | null
}

const props = defineProps<Props>()

const split = computed(() =>
  splitChecks(
    props.verification,
    props.exercise.testCases,
    props.exercise.functionName,
    props.exercise.hiddenTestCaseCount,
  ),
)

const executionLabel = computed(() => {
  if (!props.execution) return null
  const run = props.execution.run
  const time = run.wall_time !== null && run.wall_time !== undefined ? ` · ${run.wall_time} ms` : ''
  if (props.execution.status === 'OK') {
    return `Exécution terminée${time}`
  }
  return props.execution.label
})
</script>

<template>
  <div
    class="flex h-60 flex-col border-t border-border bg-surface text-text shrink-0"
    aria-live="polite"
  >
    <!-- Barre haute onglets Tests / Console -->
    <div class="flex items-center justify-between border-b border-border px-4 py-2 bg-surface-muted/30">
      <div role="tablist" class="flex items-center gap-4 text-xs font-semibold">
        <button
          type="button"
          role="tab"
          :aria-selected="tab === 'tests'"
          class="flex items-center gap-1.5 py-1 transition-colors cursor-pointer"
          :class="tab === 'tests' ? 'text-primary border-b-2 border-primary -mb-[9px] pb-1 font-bold' : 'text-text-muted hover:text-text'"
          @click="tab = 'tests'"
        >
          <Icon name="lucide:check-square" class="size-3.5" />
          <span>Tests</span>
          <span
            v-if="split.hasRun"
            class="rounded-full px-1.5 py-0.2 text-[10px]"
            :class="split.passed ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'"
          >
            {{ split.passedCaseCount }}/{{ split.totalCaseCount }}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          :aria-selected="tab === 'console'"
          class="flex items-center gap-1.5 py-1 transition-colors cursor-pointer"
          :class="tab === 'console' ? 'text-primary border-b-2 border-primary -mb-[9px] pb-1 font-bold' : 'text-text-muted hover:text-text'"
          @click="tab = 'console'"
        >
          <Icon name="lucide:terminal" class="size-3.5" />
          <span>Console</span>
        </button>
      </div>

      <span v-if="tab === 'console' && executionLabel" class="text-xs text-text-muted font-mono">
        {{ executionLabel }}
      </span>
    </div>

    <!-- Contenu Tests -->
    <div v-show="tab === 'tests'" class="flex-1 overflow-y-auto p-4 text-xs font-mono">
      <div v-if="!split.hasRun" class="flex items-center gap-2 text-text-muted">
        <Icon name="lucide:circle-dashed" class="size-4" />
        <span>Pas encore vérifiés. Cliquez sur « Vérifier » pour exécuter les cas de test.</span>
      </div>

      <div v-else class="flex flex-col gap-2">
        <div class="flex items-center gap-2 font-sans font-semibold text-sm" :class="split.passed ? 'text-success' : 'text-danger'">
          <Icon :name="split.passed ? 'lucide:circle-check' : 'lucide:circle-x'" class="size-4" />
          <span>{{ split.passedCaseCount }} cas sur {{ split.totalCaseCount }} réussis</span>
        </div>

        <!-- Détail des échecs -->
        <div v-if="!split.passed" class="flex flex-col gap-1.5 pt-2 border-t border-border/50">
          <div
            v-for="c in split.testCaseChecks.filter((tc) => !tc.passed)"
            :key="c.index"
            class="flex flex-col gap-0.5 rounded-[8px] bg-danger-soft p-2 text-danger"
          >
            <span class="font-semibold">{{ c.callDisplay }} attend {{ c.expectedDisplay }} · reçu {{ c.actualDisplay ?? c.detail ?? 'non défini' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Contenu Console -->
    <div v-show="tab === 'console'" class="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed">
      <div v-if="!execution" class="text-text-muted">
        Cliquez sur « Exécuter » pour voir ce que le programme affiche.
      </div>
      <div v-else class="flex flex-col gap-2">
        <!-- Sortie stdout -->
        <pre v-if="execution.run.stdout" class="whitespace-pre-wrap text-text"><code>{{ execution.run.stdout }}</code></pre>

        <!-- Sortie stderr -->
        <pre v-if="execution.run.stderr" class="whitespace-pre-wrap text-danger"><code>{{ execution.run.stderr }}</code></pre>

        <!-- Message si aucune sortie -->
        <div v-if="!execution.run.stdout && !execution.run.stderr" class="text-text-muted italic">
          Le programme ne produit aucune sortie console.
        </div>

        <p class="mt-2 text-[11px] font-sans text-text-muted border-t border-border/40 pt-2">
          Exécuter montre ce que le programme affiche. Seul « Vérifier » juge votre solution.
        </p>
      </div>
    </div>
  </div>
</template>
