import { describe, expect, it } from 'vitest'

import {
  QUESTIONNAIRE_OPTIONS,
  QUESTIONNAIRE_QUESTIONS,
} from '../../../backend/src/content/questionnaire.ts'
import { InMemoryPlacementRepository } from '../../../backend/src/repository/placement.repository.ts'
import { InMemoryQuestionnaireRepository } from '../../../backend/src/repository/questionnaire.repository.ts'
import { InMemoryTrackRepository } from '../../../backend/src/repository/track.repository.ts'
import type { ResultsInput } from '../../../backend/src/service/questionnaire.service.ts'
import { QuestionnaireService } from '../../../backend/src/service/questionnaire.service.ts'

const tracks = new InMemoryTrackRepository()
const placements = new InMemoryPlacementRepository()
const service = new QuestionnaireService(new InMemoryQuestionnaireRepository(), tracks, placements)

const byKind = (kind: string) => QUESTIONNAIRE_QUESTIONS.filter((q) => q.kind === kind)
const optionsOf = (questionId: number) =>
  QUESTIONNAIRE_OPTIONS.filter((o) => o.questionId === questionId)
const bestChoices = () =>
  [...byKind('experience'), ...byKind('knowledge')].map((q) => ({
    questionId: q.id,
    optionId: optionsOf(q.id).reduce((a, b) => (b.score > a.score ? b : a)).id,
  }))
const language = byKind('language')[0]!
const languageChoice = (slug: string) => ({
  questionId: language.id,
  optionId: optionsOf(language.id).find((o) => o.trackSlug === slug)!.id,
})
const [knowledge] = byKind('knowledge')
const [code] = byKind('code')
const submit = (input: Partial<ResultsInput>) =>
  service.submitResults({ choices: [], submissions: [], ...input })

describe('QuestionnaireService.getQuestionnaire', () => {
  it('sert les questions sans score, sans solution ni cas cachés', async () => {
    const questions = await service.getQuestionnaire()

    expect(questions.map((q) => q.id)).toEqual(QUESTIONNAIRE_QUESTIONS.map((q) => q.id))
    expect(JSON.stringify(questions)).not.toMatch(/score|solution|isHidden/i)
    const knowledgeView = questions.find((q) => q.id === knowledge!.id)!
    expect(knowledgeView.options).toEqual(
      optionsOf(knowledge!.id).map((o) => ({ id: o.id, label: o.label })),
    )
    const codeView = questions.find((q) => q.id === code!.id)!
    expect(codeView).toMatchObject({ functionName: 'ajouter', options: [] })
    expect(codeView.testCases).toHaveLength(3)
  })
})

describe('QuestionnaireService.submitResults', () => {
  it('sans exercice soumis : débutant, premier chapitre débutant du parcours JavaScript', async () => {
    const outcome = await submit({ choices: bestChoices() })

    expect(outcome.ok).toBe(true)
    expect(outcome.ok && outcome.result).toMatchObject({
      level: 'beginner',
      practical: 0,
      track: { slug: 'javascript', name: 'JavaScript' },
      startChapter: { slug: 'syntaxe-et-nommage' },
    })
    expect(outcome.ok && outcome.result.exercises).toEqual(
      byKind('code').map((q) => expect.objectContaining({ questionId: q.id, passed: false })),
    )
  })

  it('enregistre le résultat, anonyme, avec les sous-scores entre 0 et 1', async () => {
    const outcome = await submit({ choices: bestChoices() })
    const result = outcome.ok ? outcome.result : null
    const javascript = await tracks.findTrackBySlug('javascript')

    expect(result?.placementId).toEqual(expect.any(Number))
    expect(await placements.findById(result!.placementId!)).toEqual({
      id: result!.placementId,
      score: result!.score,
      level: result!.level,
      trackId: javascript!.id,
      declared: result!.declared / 100,
      knowledge: result!.knowledge / 100,
      practical: result!.practical / 100,
      userId: null,
      createdAt: expect.any(Date),
    })
  })

  it('un exercice laissé vide compte comme non soumis, sans appeler le moteur', async () => {
    const outcome = await submit({
      submissions: [{ questionId: code!.id, code: '   ', programmingLanguage: 'javascript' }],
    })

    expect(outcome.ok && outcome.result.exercises[0]).toEqual({
      questionId: code!.id,
      title: code!.title,
      passedCases: 0,
      totalCases: 4,
      passed: false,
    })
  })

  it('renvoie un débutant qui choisit TypeScript vers JavaScript', async () => {
    const outcome = await submit({ choices: [languageChoice('typescript')] })

    expect(outcome.ok && outcome.result.track?.slug).toBe('javascript')
  })

  it.each([
    [
      'une option d’une autre question',
      () => ({ choices: [{ questionId: knowledge!.id, optionId: optionsOf(1)[0]!.id }] }),
      /n’appartient pas/,
    ],
    [
      'un choix pour un exercice',
      () => ({ choices: [{ questionId: code!.id, optionId: 1 }] }),
      /n’attend pas de choix/,
    ],
    [
      'une question inconnue',
      () => ({ choices: [{ questionId: 999, optionId: 1 }] }),
      /n’attend pas de choix/,
    ],
    [
      'du code pour une question à choix',
      () => ({
        submissions: [
          { questionId: knowledge!.id, code: 'x', programmingLanguage: 'javascript' as const },
        ],
      }),
      /n’attend pas de code/,
    ],
    [
      'deux réponses à la même question',
      () => ({ choices: [languageChoice('javascript'), languageChoice('typescript')] }),
      /plusieurs réponses/,
    ],
  ])('refuse %s', async (_cas, input, message) => {
    const outcome = await submit(input())

    expect(outcome.ok).toBe(false)
    expect(!outcome.ok && outcome.error).toMatch(message)
  })
})

describe('QuestionnaireService.verify', () => {
  it('ne corrige que les questions de code', async () => {
    expect(await service.verify(knowledge!.id, 'function f() {}')).toBeNull()
    expect(await service.verify(999, 'function f() {}')).toBeNull()
  })

  it('refuse une syntaxe TypeScript non prise en charge sans appeler le moteur', async () => {
    const verification = await service.verify(code!.id, 'enum A { X }', 'typescript')

    expect(verification).toMatchObject({ ok: false, error: expect.stringMatching(/enum/) })
  })
})
