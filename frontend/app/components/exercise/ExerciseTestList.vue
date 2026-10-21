<script setup lang="ts">
import type { PublicExercise, VerificationResult } from '@scalar/shared/api'
import { splitChecks } from '~/utils/verification'

interface Props {
  exercise: PublicExercise
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
</script>

<template>
  <div class="flex flex-col gap-3 pt-4 border-t border-border">
    <!-- En-tête Cas de test -->
    <div class="flex items-center justify-between">
      <h3 class="text-xs font-bold uppercase tracking-wider text-text-muted">
        Cas de test
      </h3>
      <span v-if="split.hasRun" class="text-xs font-semibold" :class="split.passed ? 'text-success' : 'text-danger'">
        {{ split.passedCaseCount }} sur {{ split.totalCaseCount }} réussis
      </span>
      <span v-else class="text-xs text-text-muted">
        {{ exercise.testCases.length + exercise.hiddenTestCaseCount }} cas
      </span>
    </div>

    <!-- Erreur générale bloquante (ex: runtime error ou fonction non définie) -->
    <div
      v-if="split.generalFailed && split.firstGeneralFailure"
      class="rounded-[10px] border border-danger bg-danger-soft p-3 text-xs text-danger"
    >
      <div class="flex items-center gap-2 font-semibold">
        <Icon name="lucide:circle-x" class="size-4 shrink-0" />
        <span>{{ split.firstGeneralFailure.label }}</span>
      </div>
      <p v-if="split.firstGeneralFailure.detail" class="mt-1 font-mono text-[11px] whitespace-pre-wrap">
        {{ split.firstGeneralFailure.detail }}
      </p>
    </div>

    <!-- Liste des cas de test -->
    <div class="flex flex-col gap-2">
      <div
        v-for="tc in split.testCaseChecks.filter((c) => !c.isHidden)"
        :key="tc.index"
        class="flex flex-col gap-1 rounded-[10px] border p-2.5 text-xs transition-colors"
        :class="[
          !split.hasRun
            ? 'border-border bg-surface'
            : tc.passed
              ? 'border-border bg-surface'
              : 'border-danger bg-danger-soft text-danger',
        ]"
      >
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 font-mono">
            <Icon
              v-if="!split.hasRun"
              name="lucide:circle-dashed"
              class="size-3.5 text-text-muted shrink-0"
            />
            <Icon
              v-else-if="tc.passed"
              name="lucide:circle-check"
              class="size-3.5 text-success shrink-0"
            />
            <Icon
              v-else
              name="lucide:circle-x"
              class="size-3.5 text-danger shrink-0"
            />

            <span class="font-semibold text-text truncate">{{ tc.callDisplay }}</span>
            <span class="text-text-muted">→</span>
            <span class="font-semibold text-text truncate">{{ tc.expectedDisplay }}</span>
          </div>

          <span v-if="tc.label && tc.label !== tc.callDisplay" class="text-text-muted truncate max-w-[40%] text-[11px]">
            {{ tc.label }}
          </span>
        </div>

        <!-- Détail si échec sur cas visible -->
        <div v-if="split.hasRun && !tc.passed" class="mt-1 flex items-center gap-1 font-mono text-[11px] text-danger">
          <span>reçu :</span>
          <span class="font-semibold">{{ tc.actualDisplay ?? tc.detail ?? 'Valeur trop longue' }}</span>
        </div>
      </div>

      <!-- Cas cachés -->
      <div
        v-if="exercise.hiddenTestCaseCount > 0"
        class="rounded-[10px] border border-dashed border-border bg-surface-muted/40 p-2.5 text-xs text-text-muted flex items-center justify-between"
      >
        <span class="italic">+ {{ exercise.hiddenTestCaseCount }} cas cachés</span>
        <span v-if="split.hasRun && split.passed" class="text-success font-semibold">
          Tous validés
        </span>
      </div>
    </div>

    <!-- Vérifications générales validées après test -->
    <div
      v-if="split.hasRun && !split.generalFailed"
      class="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-text-muted border-t border-border/50 pt-2"
    >
      <span class="flex items-center gap-1 text-success font-medium">
        <Icon name="lucide:check" class="size-3" />
        Le programme s'exécute
      </span>
      <span class="flex items-center gap-1 text-success font-medium">
        <Icon name="lucide:check" class="size-3" />
        {{ exercise.functionName }} est définie
      </span>
    </div>
  </div>
</template>
