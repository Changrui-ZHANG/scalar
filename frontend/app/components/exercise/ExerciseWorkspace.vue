<script setup lang="ts">
// Colonne Code de l'exercice (specs-site.md § 7.1, § 7.4) : l'unique éditeur, puis le
// panneau Résultat ou le bandeau de réussite. Sur mobile, l'onglet choisi montre l'un
// ou l'autre, et l'onglet Code ajoute la rangée de touches { } ( ) …
import type { ExecutionResult, PublicExercise, VerificationResult } from '@scalar/shared/api'
import type { Episode } from '~/types/episode'
import type { DraftStatus, MobileExerciseTab, ResultTab, RunPending } from '~/types/exercise'
import { caseCount } from '~/utils/verification'

const code = defineModel<string>('code', { required: true })
const resultTab = defineModel<ResultTab>('resultTab', { required: true })

interface Props {
  exercise: PublicExercise
  mobileTab: MobileExerciseTab
  pending: RunPending
  draftStatus: DraftStatus
  starterChanged: boolean
  error: string | null
  execution: ExecutionResult | null
  verification: VerificationResult | null
  passed: boolean
  next: Episode | null
  overviewPath: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  run: []
  verify: []
  reset: []
}>()

const codePanel = ref<{ insertAtCursor(text: string, cursorOffset?: number): void } | null>(null)
const total = computed(() => (props.verification ? caseCount(props.verification).total : 0))
</script>

<template>
  <section class="min-h-0 flex-1 flex-col gap-3.5 p-2.5 md:flex md:px-6 md:py-5">
    <ExerciseCodePanel
      ref="codePanel"
      v-model="code"
      :class="mobileTab === 'result' ? 'max-md:hidden' : ''"
      :language="exercise.track.programmingLanguage ?? 'javascript'"
      :pending="pending"
      :draft-status="draftStatus"
      :starter-changed="starterChanged"
      :error="error"
      @run="emit('run')"
      @verify="emit('verify')"
      @reset="emit('reset')"
    />
    <ExerciseMobileKeys
      v-if="mobileTab === 'code'"
      @insert="(text, offset) => codePanel?.insertAtCursor(text, offset)"
    />

    <div class="flex-col gap-3.5 md:flex" :class="mobileTab === 'result' ? 'flex' : 'hidden'">
      <ExerciseSuccessBanner
        v-if="passed"
        :case-count="total"
        :next="next"
        :overview-path="overviewPath"
      />
      <ExerciseResultPanel
        v-else
        v-model:tab="resultTab"
        :exercise="exercise"
        :execution="execution"
        :verification="verification"
      />
    </div>
  </section>
</template>
