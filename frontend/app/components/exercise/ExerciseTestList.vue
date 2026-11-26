<script setup lang="ts">
// Cas de test sous la consigne (specs-site.md § 7.1, § 7.2) : une ligne par cas visible,
// les deux vérifications générales après « Vérifier », et « + n cas cachés ».
import type {
  PublicExercise,
  PublicTestCase,
  VerificationCheck,
  VerificationResult,
} from '@scalar/shared/api'
import {
  caseCount,
  failedGeneralCheck,
  formatCall,
  formatJson,
  splitChecks,
} from '~/utils/verification'

interface Props {
  exercise: PublicExercise
  verification: VerificationResult | null
}

const { exercise, verification } = defineProps<Props>()

// Une ligne par cas visible, avec son résultat s'il y a eu une vérification.
const rows = computed(() => {
  const list: { testCase: PublicTestCase; check: VerificationCheck | null }[] = []
  if (!verification) {
    for (const testCase of exercise.testCases) {
      list.push({ testCase, check: null })
    }
    return list
  }
  for (const item of splitChecks(verification, exercise.testCases).visible) {
    list.push(item)
  }
  return list
})

const generalFailure = computed(() => (verification ? failedGeneralCheck(verification) : null))
const count = computed(() => (verification ? caseCount(verification) : null))
</script>

<template>
  <div class="flex flex-col gap-2.5 pt-1.5">
    <div class="flex items-center justify-between">
      <h2 class="text-label text-text font-sans font-bold">Cas de test</h2>
      <span
        v-if="count"
        class="text-meta font-semibold"
        :class="verification?.passed ? 'text-success' : 'text-danger'"
      >
        {{ count.passed }} cas sur {{ count.total }} réussis
      </span>
      <span v-else class="text-meta text-text-muted font-semibold">Pas encore vérifiés</span>
    </div>

    <!-- Une vérification générale en échec passe en tête ; les cas ne sont alors pas détaillés -->
    <div
      v-if="generalFailure"
      class="rounded-row border-danger bg-danger-soft text-danger border px-3 py-2.5 text-sm"
    >
      <p class="flex items-center gap-2 font-semibold">
        <Icon name="lucide:circle-x" class="size-4 shrink-0" />
        {{ generalFailure.label }}
      </p>
      <p v-if="generalFailure.detail" class="mt-1 font-mono text-xs whitespace-pre-wrap">
        {{ generalFailure.detail }}
      </p>
    </div>

    <template v-else>
      <div
        v-for="(row, index) in rows"
        :key="index"
        class="rounded-row flex flex-col gap-0.75 border px-3 py-2.5"
        :class="
          row.check && !row.check.passed
            ? 'border-danger bg-danger-soft'
            : 'border-border bg-surface'
        "
      >
        <p class="text-small text-text flex flex-wrap items-center gap-2 font-mono">
          <Icon
            v-if="!row.check"
            name="lucide:circle-dashed"
            class="text-text-muted size-4 shrink-0"
          />
          <Icon
            v-else-if="row.check.passed"
            name="lucide:circle-check"
            class="text-success size-4 shrink-0"
          />
          <Icon v-else name="lucide:circle-x" class="text-danger size-4 shrink-0" />
          {{ formatCall(exercise.functionName, row.testCase.arguments) }}
          <Icon name="lucide:arrow-right" class="text-text-muted size-3.5" />
          {{ formatJson(row.testCase.expectedResult) }}
        </p>
        <p v-if="row.testCase.description" class="text-meta text-text-muted pl-6">
          {{ row.testCase.description }}
        </p>
        <p v-if="row.check && !row.check.passed" class="text-danger pl-6 font-mono text-xs">
          <template v-if="row.check.actual !== null"
            >reçu {{ formatJson(row.check.actual) }}</template
          >
          <template v-else>{{ row.check.detail }}</template>
        </p>
      </div>
    </template>

    <p
      v-if="verification && !generalFailure"
      class="text-tag text-text-muted flex flex-wrap gap-3.5"
    >
      <span class="flex items-center gap-1.25">
        <Icon name="lucide:check" class="text-success size-3" />
        Le programme s’exécute
      </span>
      <span class="flex items-center gap-1.25">
        <Icon name="lucide:check" class="text-success size-3" />
        {{ exercise.functionName }} est définie
      </span>
    </p>

    <p v-if="exercise.hiddenTestCaseCount > 0" class="text-meta text-text-muted">
      + {{ countLabel(exercise.hiddenTestCaseCount, 'cas caché', 'cas cachés') }}
    </p>
  </div>
</template>
