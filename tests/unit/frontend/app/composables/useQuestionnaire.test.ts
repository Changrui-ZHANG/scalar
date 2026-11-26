import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useQuestionnaire } from '../../../../../frontend/app/composables/useQuestionnaire'
import * as questionnaireService from '../../../../../frontend/app/services/questionnaire'
import { useAuthStore } from '../../../../../frontend/app/stores/auth'
import type { PublicQuestion } from '../../../../../frontend/app/types/questionnaire'

const choice: PublicQuestion = {
  id: 1,
  position: 1,
  kind: 'experience',
  title: 'Où en êtes-vous ?',
  description: null,
  options: [
    { id: 10, label: 'Débutant' },
    { id: 11, label: 'Confirmé' },
  ],
  functionName: null,
  starterCode: null,
  testCases: [],
}

const code: PublicQuestion = {
  id: 2,
  position: 2,
  kind: 'code',
  title: 'Somme',
  description: null,
  options: [],
  functionName: 'ajouter',
  starterCode: 'function ajouter(a, b) {}',
  testCases: [{ arguments: [1, 2], expectedResult: 3, description: null }],
}

const result = {
  score: 40,
  level: 'beginner' as const,
  feedback: [],
  track: { slug: 'javascript', name: 'JavaScript' },
  startChapter: null,
  exercises: [],
}

describe('useQuestionnaire', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
    // Compte connecté : aucun apprenant anonyme à créer.
    useAuthStore().account = { id: 'a1', email: 'ada@example.com', role: 'learner' }
  })

  it('n’avance pas sur une question à choix sans réponse', async () => {
    const quiz = useQuestionnaire(ref([choice, code]))

    await quiz.next()
    expect(quiz.index.value).toBe(0)

    quiz.choose(choice, 11)
    await quiz.next()
    expect(quiz.index.value).toBe(1)
  })

  it('envoie les choix et le code, même laissé tel quel', async () => {
    const submit = vi
      .spyOn(questionnaireService, 'submitQuestionnaire')
      .mockResolvedValueOnce(result)
    const quiz = useQuestionnaire(ref([choice, code]))

    quiz.choose(choice, 10)
    await quiz.next()
    expect(quiz.canGoNext.value).toBe(true) // un exercice peut être laissé de côté
    await quiz.next()

    expect(submit).toHaveBeenCalledWith(
      {
        choices: [{ questionId: 1, optionId: 10 }],
        submissions: [{ questionId: 2, code: 'function ajouter(a, b) {}' }],
      },
      {},
    )
    expect(quiz.result.value).toEqual(result)
  })

  it('essaie le code écrit, puis recommence à zéro', async () => {
    const verdict = { passed: true, passedCount: 3, total: 3, checks: [], execution: null }
    const tryCode = vi
      .spyOn(questionnaireService, 'tryQuestionCode')
      // @ts-expect-error -- exécution non utile ici
      .mockResolvedValueOnce(verdict)
    const quiz = useQuestionnaire(ref([code]))

    quiz.setCode(code, 'function ajouter(a, b) { return a + b }')
    await quiz.tryCode()

    expect(tryCode).toHaveBeenCalledWith(2, 'function ajouter(a, b) { return a + b }')
    expect(quiz.tries.value[2]).toEqual(verdict)

    quiz.restart()
    expect(quiz.codeOf(code)).toBe('function ajouter(a, b) {}')
    expect(quiz.tries.value[2]).toBeUndefined()
  })
})
