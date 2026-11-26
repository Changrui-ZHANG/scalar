<script setup lang="ts">
// Panneau Résultat sous l'éditeur (specs-site.md § 7.1, § 7.2) : onglets Tests et Console.
import type { ExecutionResult, PublicExercise, VerificationResult } from '@scalar/shared/api'
import type { ResultTab } from '~/types/exercise'
import {
  caseCount,
  failedGeneralCheck,
  formatCall,
  formatJson,
  splitChecks,
} from '~/utils/verification'

const tab = defineModel<ResultTab>('tab', { default: 'tests' })

interface Props {
  exercise: PublicExercise
  execution: ExecutionResult | null // résultat d'« Exécuter », ou exécution de la dernière vérification
  verification: VerificationResult | null
}

const { exercise, execution, verification } = defineProps<Props>()

const count = computed(() => (verification ? caseCount(verification) : null))
const generalChecks = computed(() =>
  verification ? splitChecks(verification, exercise.testCases).general : [],
)
const generalFailure = computed(() => (verification ? failedGeneralCheck(verification) : null))

// Cas visibles en échec : « appel attend x · reçu y ».
const failedCases = computed(() => {
  if (!verification) return []
  const list = []
  for (const item of splitChecks(verification, exercise.testCases).visible) {
    if (!item.check.passed) list.push(item)
  }
  return list
})
const hiddenFailed = computed(() =>
  verification ? splitChecks(verification, exercise.testCases).hiddenFailed : 0,
)

// « Exécution terminée · 38 ms » (durée omise si inconnue), ou le libellé d'erreur de l'API.
const executionTitle = computed(() => {
  if (!execution) return ''
  if (execution.status !== 'OK') return execution.label
  if (execution.run.wall_time === null) return 'Exécution terminée'
  return `Exécution terminée · ${execution.run.wall_time} ms`
})
</script>

<template>
  <div
    class="rounded-card border-border bg-surface flex h-60 shrink-0 resize-y flex-col gap-2.5 overflow-auto border px-4 py-3.5"
    aria-live="polite"
  >
    <div class="flex items-center justify-between gap-3">
      <!-- Titre de l'onglet Tests -->
      <p v-if="tab === 'tests'" class="text-label text-text flex items-center gap-2 font-bold">
        <template v-if="!count">
          <Icon name="lucide:circle-dashed" class="text-text-muted size-4.5" />
          Pas encore vérifiés
        </template>
        <template v-else>
          <Icon
            v-if="verification?.passed"
            name="lucide:circle-check"
            class="text-success size-4.5"
          />
          <Icon v-else name="lucide:circle-x" class="text-danger size-4.5" />
          {{ count.passed }} cas sur {{ count.total }} réussis
        </template>
      </p>
      <!-- Titre de l'onglet Console -->
      <p v-else class="text-label text-text flex items-center gap-2 font-bold">
        <template v-if="!execution">
          <Icon name="lucide:terminal" class="text-text-muted size-4.5" />
          Console
        </template>
        <template v-else>
          <Icon
            v-if="execution.status === 'OK'"
            name="lucide:terminal"
            class="text-text-muted size-4.5"
          />
          <Icon v-else name="lucide:circle-x" class="text-danger size-4.5" />
          {{ executionTitle }}
        </template>
      </p>

      <div role="tablist" aria-label="Résultat" class="text-small flex gap-4">
        <button
          type="button"
          role="tab"
          :aria-selected="tab === 'tests'"
          class="min-h-6 cursor-pointer"
          :class="tab === 'tests' ? 'text-text font-semibold' : 'text-text-muted hover:text-text'"
          @click="tab = 'tests'"
        >
          Tests
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="tab === 'console'"
          class="min-h-6 cursor-pointer"
          :class="tab === 'console' ? 'text-text font-semibold' : 'text-text-muted hover:text-text'"
          @click="tab = 'console'"
        >
          Console
        </button>
      </div>
    </div>

    <!-- Tests -->
    <template v-if="tab === 'tests'">
      <p v-if="!verification" class="text-small text-text-muted">
        « Vérifier » lance les cas de test, visibles et cachés.
      </p>
      <template v-else>
        <p class="text-tag text-text-muted flex flex-wrap gap-3.5">
          <span
            v-for="check in generalChecks"
            :key="check.label"
            class="flex items-center gap-1.25"
          >
            <Icon v-if="check.passed" name="lucide:check" class="text-success size-3" />
            <Icon v-else name="lucide:x" class="text-danger size-3" />
            {{ check.label }}
          </span>
        </p>
        <p
          v-if="generalFailure?.detail"
          class="rounded-row bg-danger-soft text-danger px-3 py-2 font-mono text-xs"
        >
          {{ generalFailure.detail }}
        </p>
        <p
          v-for="(item, index) in failedCases"
          :key="index"
          class="rounded-row bg-danger-soft flex flex-wrap items-center gap-2 px-3 py-2.25 text-sm"
        >
          <span class="text-small text-text font-mono">{{
            formatCall(exercise.functionName, item.testCase.arguments)
          }}</span>
          <span class="text-text-muted">attend</span>
          <span class="text-small text-text font-mono">{{
            formatJson(item.testCase.expectedResult)
          }}</span>
          <template v-if="item.check.actual !== null">
            <span class="text-text-muted">· reçu</span>
            <span class="text-small text-danger font-mono">{{
              formatJson(item.check.actual)
            }}</span>
          </template>
          <span v-else class="text-danger">· {{ item.check.detail }}</span>
        </p>
        <p
          v-if="hiddenFailed > 0"
          class="rounded-row bg-danger-soft text-danger px-3 py-2.25 text-sm"
        >
          Résultat incorrect sur un cas non affiché.
        </p>
      </template>
    </template>

    <!-- Console -->
    <template v-else>
      <p v-if="!execution" class="text-small text-text-muted">
        « Exécuter » lance votre programme et affiche ici ce qu’il écrit.
      </p>
      <template v-else>
        <div class="rounded-row bg-code-bg flex flex-col gap-1.5 px-3 py-2.5 font-mono text-sm">
          <pre v-if="execution.run.stdout" class="text-code-text whitespace-pre-wrap">{{
            execution.run.stdout
          }}</pre>
          <pre v-if="execution.run.stderr" class="text-danger whitespace-pre-wrap">{{
            execution.run.stderr
          }}</pre>
          <p v-if="!execution.run.stdout && !execution.run.stderr" class="text-text-muted">
            Le programme n’a rien affiché.
          </p>
        </div>
        <p class="text-small text-text-muted">
          Exécuter montre ce que le programme affiche. Seul « Vérifier » juge votre solution.
        </p>
      </template>
    </template>
  </div>
</template>
