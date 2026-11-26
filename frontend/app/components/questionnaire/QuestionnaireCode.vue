<script setup lang="ts">
// Exercice du positionnement : cas de test, éditeur, « Essayer » (rien n'est enregistré).
import type { VerificationResult } from '@scalar/shared/api'
import type { PublicQuestion } from '~/types/questionnaire'
import { caseCount, failedGeneralCheck, formatCall, formatJson } from '~/utils/verification'

interface Props {
  question: PublicQuestion
  tryResult: VerificationResult | undefined
  trying: boolean
}

const { question, tryResult, trying } = defineProps<Props>()

const code = defineModel<string>({ required: true })

const emit = defineEmits<{
  try: []
}>()

// Résumé du dernier essai : erreur générale, sinon le nombre de cas réussis.
const tryText = computed(() => {
  if (!tryResult) return null
  const general = failedGeneralCheck(tryResult)
  if (general) return general.detail ?? general.label
  const count = caseCount(tryResult)
  return `${count.passed} cas sur ${count.total} réussis`
})
</script>

<template>
  <div class="flex flex-col gap-5">
    <ContentRichText
      v-if="question.description"
      :source="question.description"
      :language="null"
      variant="compact"
    />

    <div v-if="question.testCases.length > 0" class="flex flex-col gap-2">
      <span class="text-ui text-text font-semibold">Cas de test</span>
      <ul class="flex flex-col gap-1.5">
        <li
          v-for="(testCase, i) in question.testCases"
          :key="i"
          class="bg-code-bg text-code-text rounded-row px-3.5 py-2 font-mono text-sm"
        >
          {{ formatCall(question.functionName ?? 'f', testCase.arguments) }} →
          {{ formatJson(testCase.expectedResult) }}
        </li>
      </ul>
    </div>

    <div class="border-border min-h-48 overflow-auto rounded-control border">
      <UiCodeEditor
        v-model="code"
        language="javascript"
        :aria-label="`Code de la fonction ${question.functionName ?? ''}`"
        @run="emit('try')"
      />
    </div>

    <div class="flex flex-wrap items-center gap-4">
      <UiButton
        variant="secondary"
        icon="lucide:play"
        dense
        :loading="trying"
        loading-label="Essai…"
        @click="emit('try')"
      >
        Essayer
      </UiButton>
      <p
        v-if="tryText"
        role="status"
        class="text-ui font-medium"
        :class="tryResult?.passed ? 'text-success' : 'text-text-muted'"
      >
        {{ tryText }}
      </p>
    </div>
    <p class="text-small text-text-muted">
      Vous pouvez laisser cet exercice de côté : il comptera simplement comme non réussi.
    </p>
  </div>
</template>
