<script setup lang="ts">
// Test de positionnement : quelques questions et exercices, puis un niveau et un
// parcours conseillé. Le résultat est enregistré pour le compte ou l'apprenant anonyme.
import type { PublicQuestion } from '~/types/questionnaire'
import { useQuestionnaire } from '~/composables/useQuestionnaire'
import { usePageSeo } from '~/composables/usePageSeo'
import { fetchQuestionnaire } from '~/services/questionnaire'
import { toPageError } from '~/utils/pageError'

definePageMeta({ layout: 'default' })

usePageSeo({
  title: ['Test de positionnement'],
  description:
    'Quelques questions et trois petits exercices pour savoir par où commencer sur Scalar.',
  type: 'website',
})

const { data, error: fetchError } = await useAsyncData('questionnaire', () => fetchQuestionnaire())
if (fetchError.value) throw toPageError(fetchError.value)

const questions = computed<readonly PublicQuestion[]>(() => data.value ?? [])

const quiz = useQuestionnaire(questions)
const { current, index, total, isLast, canGoNext, result, error } = quiz

const percent = computed(() => (total.value === 0 ? 0 : (index.value / total.value) * 100))

// Code de la question courante, pour le v-model de l'éditeur.
const currentCode = computed({
  get: () => (current.value ? quiz.codeOf(current.value) : ''),
  set: (code: string) => {
    if (current.value) quiz.setCode(current.value, code)
  },
})
</script>

<template>
  <div class="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-12 md:py-16">
    <QuestionnaireResult v-if="result" :result="result" @restart="quiz.restart()" />

    <template v-else-if="current">
      <div class="flex flex-col gap-3">
        <span class="text-small text-text-muted font-medium">
          Test de positionnement · question {{ index + 1 }} sur {{ total }}
        </span>
        <UiProgressBar :value="percent" label="Avancement du test" />
      </div>

      <div
        role="heading"
        aria-level="1"
        class="font-display text-text text-2xl font-semibold md:text-3xl"
      >
        <ContentRichText :source="current.title" :language="null" variant="compact" />
      </div>

      <QuestionnaireCode
        v-if="current.kind === 'code'"
        :key="current.id"
        v-model="currentCode"
        :question="current"
        :try-result="quiz.tries.value[current.id]"
        :trying="quiz.trying.value"
        @try="quiz.tryCode()"
      />
      <QuestionnaireChoice
        v-else
        :key="current.id"
        :question="current"
        :selected="quiz.choices.value[current.id]"
        @choose="(optionId) => quiz.choose(current!, optionId)"
      />

      <p
        v-if="error"
        role="alert"
        class="bg-danger-soft text-danger text-ui rounded-row px-4 py-3 font-medium"
      >
        {{ error }}
      </p>

      <div class="flex flex-wrap items-center justify-between gap-3">
        <UiButton
          v-if="index > 0"
          variant="secondary"
          icon="lucide:arrow-left"
          @click="quiz.previous()"
        >
          Précédent
        </UiButton>
        <span v-else />
        <UiButton
          :disabled="!canGoNext"
          :loading="quiz.submitting.value"
          loading-label="Calcul du résultat…"
          :icon-right="isLast ? undefined : 'lucide:arrow-right'"
          @click="quiz.next()"
        >
          {{ isLast ? 'Voir mon résultat' : 'Suivant' }}
        </UiButton>
      </div>
    </template>

    <UiStatePanel
      v-else
      icon="lucide:list-checks"
      title="Test indisponible"
      text="Le test de positionnement n’a aucune question pour l’instant. Revenez bientôt."
    >
      <template #actions>
        <UiButton to="/parcours">Voir les parcours</UiButton>
      </template>
    </UiStatePanel>
  </div>
</template>
