import { computed, ref } from 'vue'
import type { Ref } from 'vue'
import type { VerificationResult } from '@scalar/shared/api'
import type { PublicQuestion, QuestionnaireResult } from '~/types/questionnaire'
import { submitQuestionnaire, tryQuestionCode } from '~/services/questionnaire'
import { useAuthStore } from '~/stores/auth'
import { apiErrorMessage } from '~/utils/apiError'

// Déroulé du questionnaire de positionnement : une question à la fois, puis
// l'envoi de toutes les réponses. Le serveur recorrige le code et calcule le niveau.
export function useQuestionnaire(questions: Ref<readonly PublicQuestion[]>) {
  const index = ref(0)
  // Réponses : option choisie par question, code écrit par question de code.
  const choices = ref<Record<number, number>>({})
  const codes = ref<Record<number, string>>({})
  // Dernier essai du code, par question (« Essayer » n'enregistre rien).
  const tries = ref<Record<number, VerificationResult>>({})

  const trying = ref(false)
  const submitting = ref(false)
  const error = ref<string | null>(null)
  const result = ref<QuestionnaireResult | null>(null)

  const total = computed(() => questions.value.length)
  const current = computed(() => questions.value[index.value] ?? null)
  const isLast = computed(() => index.value === total.value - 1)

  // Une question à choix demande une réponse ; un exercice peut être laissé de côté.
  const canGoNext = computed(() => {
    const question = current.value
    if (!question) return false
    if (question.kind === 'code') return true
    return choices.value[question.id] !== undefined
  })

  // Code affiché dans l'éditeur : celui de l'apprenant, sinon le code de départ.
  function codeOf(question: PublicQuestion): string {
    return codes.value[question.id] ?? question.starterCode ?? ''
  }

  function setCode(question: PublicQuestion, code: string): void {
    codes.value[question.id] = code
  }

  function choose(question: PublicQuestion, optionId: number): void {
    choices.value[question.id] = optionId
  }

  async function tryCode(): Promise<void> {
    const question = current.value
    if (!question || question.kind !== 'code') return
    error.value = null
    trying.value = true
    try {
      tries.value[question.id] = await tryQuestionCode(question.id, codeOf(question))
    } catch (err) {
      error.value = apiErrorMessage(err, 'L’essai a échoué. Réessayez.')
    } finally {
      trying.value = false
    }
  }

  async function submit(): Promise<void> {
    error.value = null
    submitting.value = true

    const choiceList = []
    const submissions = []
    for (const question of questions.value) {
      if (question.kind === 'code') {
        submissions.push({ questionId: question.id, code: codeOf(question) })
      } else if (choices.value[question.id] !== undefined) {
        choiceList.push({ questionId: question.id, optionId: choices.value[question.id]! })
      }
    }

    try {
      // Rattaché au compte, ou à l'apprenant anonyme de ce navigateur.
      const headers = await useAuthStore().learnerHeaders()
      result.value = await submitQuestionnaire({ choices: choiceList, submissions }, headers)
    } catch (err) {
      error.value = apiErrorMessage(err, 'Le résultat n’a pas pu être calculé. Réessayez.')
    } finally {
      submitting.value = false
    }
  }

  async function next(): Promise<void> {
    if (!canGoNext.value) return
    error.value = null
    if (isLast.value) {
      await submit()
    } else {
      index.value++
    }
  }

  function previous(): void {
    error.value = null
    if (index.value > 0) index.value--
  }

  function restart(): void {
    index.value = 0
    result.value = null
    error.value = null
    choices.value = {}
    codes.value = {}
    tries.value = {}
  }

  return {
    index,
    total,
    current,
    isLast,
    canGoNext,
    choices,
    tries,
    trying,
    submitting,
    error,
    result,
    codeOf,
    setCode,
    choose,
    tryCode,
    next,
    previous,
    restart,
  }
}
