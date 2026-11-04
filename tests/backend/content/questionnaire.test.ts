import { describe, expect, it } from 'vitest'

import { QUESTIONNAIRE_WEIGHTS } from '../../../backend/src/constants.ts'
import {
  QUESTIONNAIRE_OPTIONS,
  QUESTIONNAIRE_QUESTIONS,
  QUESTIONNAIRE_TEST_CASES,
} from '../../../backend/src/content/questionnaire.ts'
import type { Content } from '../../../backend/src/database/seed.ts'
import { CONTENT, validateExercises } from '../../../backend/src/database/seed.ts'

const questions = QUESTIONNAIRE_QUESTIONS
const optionsOf = (questionId: number) =>
  QUESTIONNAIRE_OPTIONS.filter((o) => o.questionId === questionId)
const unique = (values: readonly unknown[]) => new Set(values).size === values.length
const contiguous = (positions: readonly number[]) =>
  positions.toSorted((a, b) => a - b).every((p, i) => p === i + 1)

describe('contenu du questionnaire', () => {
  it('identifiants uniques et positions continues', () => {
    expect(unique(questions.map((q) => q.id))).toBe(true)
    expect(unique(QUESTIONNAIRE_OPTIONS.map((o) => o.id))).toBe(true)
    expect(unique(QUESTIONNAIRE_TEST_CASES.map((t) => t.id))).toBe(true)
    expect(contiguous(questions.map((q) => q.position))).toBe(true)
    for (const q of questions) {
      expect(contiguous(optionsOf(q.id).map((o) => o.position))).toBe(true)
    }
  })

  it('une seule question de langage, dont chaque option mène à un parcours publié avec langage', () => {
    const language = questions.filter((q) => q.kind === 'language')
    const playable = CONTENT.tracks
      .filter((t) => t.status === 'published' && t.programmingLanguage !== null)
      .map((t) => t.slug)

    expect(language).toHaveLength(1)
    for (const option of optionsOf(language[0]!.id)) {
      expect(playable).toContain(option.trackSlug)
    }
  })

  it('chaque question de connaissances a une seule bonne réponse', () => {
    for (const q of questions.filter((q) => q.kind === 'knowledge')) {
      const scores = optionsOf(q.id).map((o) => o.score)
      expect(scores.filter((s) => s === 1)).toHaveLength(1)
      expect(scores.every((s) => s === 0 || s === 1)).toBe(true)
    }
  })

  it('scores d’options entre 0 et 1, poids des familles de somme 1', () => {
    expect(QUESTIONNAIRE_OPTIONS.every((o) => o.score >= 0 && o.score <= 1)).toBe(true)
    expect(Object.values(QUESTIONNAIRE_WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(1)
  })

  it('seules les questions de code portent du code et des cas, les autres des options', () => {
    for (const q of questions) {
      const isCode = q.kind === 'code'
      expect([q.functionName, q.starterCode, q.solutionCode].every((v) => v !== null)).toBe(isCode)
      expect(QUESTIONNAIRE_TEST_CASES.some((t) => t.questionId === q.id)).toBe(isCode)
      expect(optionsOf(q.id).length > 0).toBe(!isCode)
    }
  })

  it('chaque solution passe ses cas, et aucun code de départ ne les passe tous', () => {
    // Même contrôle que les exercices des parcours, rattachés à un chapitre JavaScript.
    const javascript = CONTENT.tracks.find((t) => t.programmingLanguage === 'javascript')!
    const chapter = CONTENT.chapters.find((c) => c.trackId === javascript.id)!
    const asExercises: Content = {
      ...CONTENT,
      exercises: questions
        .filter((q) => q.kind === 'code')
        .map((q) => ({
          ...CONTENT.exercises[0]!,
          id: q.id,
          chapterId: chapter.id,
          slug: `questionnaire-${q.functionName}`,
          functionName: q.functionName!,
          starterCode: q.starterCode!,
          solutionCode: q.solutionCode!,
        })),
      testCases: QUESTIONNAIRE_TEST_CASES.map((t) => ({ ...t, exerciseId: t.questionId })),
    }

    expect(validateExercises(asExercises)).toEqual([])
  })
})
