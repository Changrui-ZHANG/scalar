import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

import { MESSAGES } from '../../../backend/src/constants.ts'

import {
  QUESTIONNAIRE_OPTIONS,
  QUESTIONNAIRE_QUESTIONS,
  QUESTIONNAIRE_TEST_CASES,
} from '../../../backend/src/content/questionnaire.ts'
import type { ExecutionResult } from '../../../backend/src/service/execution.service.ts'
import type { QuestionnaireQuestionKind } from '../../../backend/src/entity/questionnaire-question.entity.ts'
import type { ExerciseScore } from '../../../backend/src/service/questionnaire-scoring.service.ts'
import {
  scoreQuestionnaire,
  toExerciseScore,
} from '../../../backend/src/service/questionnaire-scoring.service.ts'
import type { VerificationResult } from '../../../backend/src/service/verification.service.ts'
import { buildHarness, readVerdict } from '../../../backend/src/service/verification.service.ts'

const questions = QUESTIONNAIRE_QUESTIONS
const options = QUESTIONNAIRE_OPTIONS
const ofKind = (kind: QuestionnaireQuestionKind) => questions.filter((q) => q.kind === kind)
const optionsOf = (questionId: number) => options.filter((o) => o.questionId === questionId)
const best = (questionId: number) =>
  optionsOf(questionId).reduce((a, b) => (b.score > a.score ? b : a))
const worst = (questionId: number) =>
  optionsOf(questionId).reduce((a, b) => (b.score < a.score ? b : a))
const languageQuestion = ofKind('language')[0]!
const languageOption = (slug: string) =>
  optionsOf(languageQuestion.id).find((o) => o.trackSlug === slug)!
const [easy, , hard] = ofKind('code')

interface Profile {
  readonly declared: 'best' | 'worst'
  readonly knowledge: 'best' | 'worst'
  readonly practical: (questionId: number) => ExerciseScore | undefined
  readonly language?: string
}

function answers(profile: Profile) {
  const choices = new Map<number, number>()
  for (const q of ofKind('experience')) {
    choices.set(q.id, (profile.declared === 'best' ? best : worst)(q.id).id)
  }
  for (const q of ofKind('knowledge')) {
    choices.set(q.id, (profile.knowledge === 'best' ? best : worst)(q.id).id)
  }
  if (profile.language) {
    choices.set(languageQuestion.id, languageOption(profile.language).id)
  }
  const exercises = new Map<number, ExerciseScore>()
  for (const q of ofKind('code')) {
    const result = profile.practical(q.id)
    if (result) {
      exercises.set(q.id, result)
    }
  }
  return { choices, exercises }
}

const all = () => ({ passedCases: 4, totalCases: 4 })
const none = () => undefined
const only = (questionId: number, result: ExerciseScore) => (id: number) =>
  id === questionId ? result : undefined
const score = (profile: Profile, prerequisiteOf?: (slug: string) => string | null) =>
  scoreQuestionnaire({ questions, options, answers: answers(profile), prerequisiteOf })

describe('scoreQuestionnaire', () => {
  it('tout réussi : avancé, 100 partout, parcours du premier langage proposé', () => {
    expect(score({ declared: 'best', knowledge: 'best', practical: all })).toEqual({
      score: 100,
      level: 'advanced',
      declared: 100,
      knowledge: 100,
      practical: 100,
      trackSlug: 'javascript',
      feedback: [],
    })
  })

  it('rien de déclaré ni de réussi : débutant à 0, sans remarque', () => {
    expect(score({ declared: 'worst', knowledge: 'worst', practical: none })).toMatchObject({
      score: 0,
      level: 'beginner',
      practical: 0,
      feedback: [],
    })
  })

  it('se dit expert mais échoue aux exercices : débutant, et le lui dit', () => {
    const result = score({ declared: 'best', knowledge: 'best', practical: none })

    expect(result).toMatchObject({ score: 40, level: 'beginner' })
    expect(result.feedback[0]).toBe(MESSAGES.placementOverestimatedBeginner)
  })

  it('se surestime sans être débutant : ne lui parle pas de consolider les bases', () => {
    const result = score({
      declared: 'best',
      knowledge: 'best',
      practical: () => ({ passedCases: 4, totalCases: 5 }),
    })

    expect(result).toMatchObject({ practical: 60, level: 'advanced' })
    expect(result.feedback).toEqual([MESSAGES.placementOverestimated])
  })

  it('réussit les exercices sans le déclarer : intermédiaire, et le lui dit', () => {
    const result = score({ declared: 'worst', knowledge: 'worst', practical: all })

    expect(result).toMatchObject({ score: 60, level: 'intermediate' })
    expect(result.feedback[0]).toMatch(/démarrer plus loin/)
  })

  it('pèse chaque exercice selon sa difficulté', () => {
    const profile = { declared: 'best', knowledge: 'best' } as const

    expect(score({ ...profile, practical: only(easy!.id, all()) }).practical).toBe(17)
    expect(score({ ...profile, practical: only(hard!.id, all()) }).practical).toBe(50)
  })

  it('ne compte que les cas réussis au-delà de ce qu’une réponse constante obtient', () => {
    const practical = (passedCases: number, totalCases: number) =>
      score({
        declared: 'worst',
        knowledge: 'worst',
        practical: () => ({ passedCases, totalCases }),
      }).practical

    expect(practical(1, 2)).toBe(0)
    expect(practical(1, 4)).toBe(0)
    expect(practical(3, 4)).toBe(50)
    expect(practical(4, 4)).toBe(100)
  })

  it('compare le plancher pratique au sous-score affiché, pas à sa valeur avant arrondi', () => {
    const [code] = ofKind('code')
    const result = scoreQuestionnaire({
      questions: [...ofKind('experience'), ...ofKind('knowledge'), { ...code!, weight: 1 }],
      options,
      answers: {
        choices: new Map(
          [...ofKind('experience'), ...ofKind('knowledge')].map((q) => [q.id, best(q.id).id]),
        ),
        // (6/10 - 0,5) / 0,5 vaut 0,19999999999999996 en virgule flottante.
        exercises: new Map([[code!.id, { passedCases: 6, totalCases: 10 }]]),
      },
    })

    expect(result).toMatchObject({ practical: 20, score: 52, level: 'intermediate' })
  })

  it('le plancher pratique impose débutant malgré un score suffisant', () => {
    const result = score({
      declared: 'best',
      knowledge: 'best',
      practical: only(easy!.id, { passedCases: 3, totalCases: 4 }),
    })

    expect(result.score).toBeGreaterThanOrEqual(40)
    expect(result.level).toBe('beginner')
  })

  it('ignore une option qui appartient à une autre question', () => {
    const [experience] = ofKind('experience')
    const [knowledge] = ofKind('knowledge')
    const result = scoreQuestionnaire({
      questions,
      options,
      answers: {
        choices: new Map([[experience!.id, best(knowledge!.id).id]]),
        exercises: new Map(),
      },
    })

    expect(result.declared).toBe(0)
  })

  it('ignore un exercice sans cas', () => {
    const empty = () => ({ passedCases: 0, totalCases: 0 })

    expect(score({ declared: 'worst', knowledge: 'worst', practical: empty }).practical).toBe(0)
  })

  it('suit le langage choisi', () => {
    const result = score({
      declared: 'best',
      knowledge: 'best',
      practical: all,
      language: 'typescript',
    })

    expect(result.trackSlug).toBe('typescript')
  })

  it('renvoie un débutant vers le prérequis du parcours choisi', () => {
    const prerequisiteOf = (slug: string) => (slug === 'typescript' ? 'javascript' : null)
    const result = score(
      { declared: 'worst', knowledge: 'worst', practical: none, language: 'typescript' },
      prerequisiteOf,
    )

    expect(result.trackSlug).toBe('javascript')
    expect(result.feedback).toContainEqual(expect.stringMatching(/prérequis/))
  })

  it('garde le parcours choisi au-delà du niveau débutant', () => {
    const prerequisiteOf = () => 'javascript'
    const result = score(
      { declared: 'best', knowledge: 'best', practical: all, language: 'typescript' },
      prerequisiteOf,
    )

    expect(result.trackSlug).toBe('typescript')
  })

  it('sans question, tout vaut 0 et aucun parcours n’est proposé', () => {
    const result = scoreQuestionnaire({
      questions: [],
      options: [],
      answers: { choices: new Map(), exercises: new Map() },
    })

    expect(result).toMatchObject({ score: 0, level: 'beginner', trackSlug: null })
  })
})

describe('toExerciseScore', () => {
  it('ne compte que les cas, pas « s’exécute » ni « est définie »', () => {
    const check = (passed: boolean) => ({ label: '', passed, detail: null })
    const result = {
      passed: false,
      passedCount: 3,
      total: 5,
      checks: [check(true), check(true), check(true), check(false), check(false)],
    } as unknown as VerificationResult

    expect(toExerciseScore(result)).toEqual({ passedCases: 1, totalCases: 3 })
  })
  it.each([
    ['la solution', (q: { solutionCode: string | null }) => q.solutionCode!, 'all'],
    ['le code de départ', (q: { starterCode: string | null }) => q.starterCode!, 'none'],
  ] as const)('avec le vrai readVerdict, compte chaque cas de %s', (_name, codeOf, expected) => {
    for (const question of ofKind('code')) {
      const cases = QUESTIONNAIRE_TEST_CASES.filter((t) => t.questionId === question.id)
      const marker = '__scalar_test__'
      const run = spawnSync(
        process.execPath,
        ['-e', buildHarness(codeOf(question), question.functionName!, cases, marker)],
        { encoding: 'utf8' },
      )
      const execution: ExecutionResult = {
        status: 'OK',
        label: '',
        run: {
          stdout: run.stdout,
          stderr: run.stderr,
          output: run.stdout + run.stderr,
          code: run.status,
          signal: null,
          status: null,
        },
      }

      expect(
        toExerciseScore(readVerdict(execution, question.functionName!, cases, marker)),
      ).toEqual({ passedCases: expected === 'all' ? cases.length : 0, totalCases: cases.length })
    }
  })
})
