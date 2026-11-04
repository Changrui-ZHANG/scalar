import { describe, expect, it } from 'vitest'

import {
  QUESTIONNAIRE_OPTIONS,
  QUESTIONNAIRE_QUESTIONS,
  QUESTIONNAIRE_TEST_CASES,
} from '../../../backend/src/content/questionnaire.ts'
import { InMemoryQuestionnaireRepository } from '../../../backend/src/repository/questionnaire.repository.ts'

const [first, second] = QUESTIONNAIRE_QUESTIONS
const code = QUESTIONNAIRE_QUESTIONS.find((q) => q.kind === 'code')!

describe('InMemoryQuestionnaireRepository', () => {
  it('sert les questions publiées dans l’ordre', async () => {
    const shuffled = [code, { ...first!, status: 'draft' as const }, second!]
    const repository = new InMemoryQuestionnaireRepository(shuffled, [], [])

    expect((await repository.listQuestions()).map((q) => q.id)).toEqual([second!.id, code.id])
  })

  it('sert les options et les cas d’une question, dans l’ordre', async () => {
    const repository = new InMemoryQuestionnaireRepository(
      QUESTIONNAIRE_QUESTIONS,
      QUESTIONNAIRE_OPTIONS.toReversed(),
      QUESTIONNAIRE_TEST_CASES.toReversed(),
    )

    const options = await repository.listOptions(first!.id)
    expect(options.map((o) => o.position)).toEqual([1, 2, 3, 4])
    expect(options.every((o) => o.questionId === first!.id)).toBe(true)
    expect((await repository.listTestCases(code.id)).map((t) => t.position)).toEqual([1, 2, 3, 4])
  })

  it('ne sert rien d’une question non publiée', async () => {
    const repository = new InMemoryQuestionnaireRepository(
      QUESTIONNAIRE_QUESTIONS.map((q) => ({ ...q, status: 'draft' as const })),
    )

    expect(await repository.listQuestions()).toEqual([])
    expect(await repository.listOptions(first!.id)).toEqual([])
    expect(await repository.listTestCases(code.id)).toEqual([])
  })
})
