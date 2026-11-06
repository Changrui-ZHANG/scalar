import type { QuestionnaireOption } from '../entity/questionnaire-option.entity.ts'
import type { QuestionnaireQuestion } from '../entity/questionnaire-question.entity.ts'
import type { QuestionnaireTestCase } from '../entity/questionnaire-test-case.entity.ts'

const DATE = new Date('2026-11-06T00:00:00Z')
const stamps = { createdAt: DATE, updatedAt: DATE }
const noCode = { functionName: null, starterCode: null, solutionCode: null }
const published = { status: 'published', ...stamps } as const

export const QUESTIONNAIRE_QUESTIONS: readonly QuestionnaireQuestion[] = [
  {
    id: 1,
    position: 1,
    kind: 'experience',
    title: 'Où en êtes-vous en programmation ?',
    description: null,
    weight: 1,
    ...noCode,
    ...published,
  },
  {
    id: 2,
    position: 2,
    kind: 'language',
    title: 'Quel langage voulez-vous apprendre ?',
    description: 'TypeScript suppose les bases de JavaScript.',
    weight: 1,
    ...noCode,
    ...published,
  },
  {
    id: 3,
    position: 3,
    kind: 'knowledge',
    title: 'Que vaut `[1, 2, 3].length` ?',
    description: null,
    weight: 1,
    ...noCode,
    ...published,
  },
  {
    id: 4,
    position: 4,
    kind: 'code',
    title: 'Somme de deux nombres',
    description:
      'Écrivez une fonction `ajouter(a, b)` qui renvoie la somme de ses deux paramètres.',
    weight: 1,
    functionName: 'ajouter',
    starterCode: 'function ajouter(a, b) {\n  // à vous de jouer\n}\n',
    solutionCode: 'function ajouter(a, b) {\n  return a + b\n}\n',
    ...published,
  },
]

const option = (
  id: number,
  questionId: number,
  position: number,
  label: string,
  score: number,
  trackSlug: string | null = null,
): QuestionnaireOption => ({ id, questionId, position, label, score, trackSlug, ...stamps })

export const QUESTIONNAIRE_OPTIONS: readonly QuestionnaireOption[] = [
  option(1, 1, 1, 'Je n’ai jamais programmé', 0),
  option(2, 1, 2, 'J’ai suivi quelques tutoriels', 1 / 3),
  option(3, 1, 3, 'J’écris de petits programmes seul', 2 / 3),
  option(4, 1, 4, 'Je programme régulièrement', 1),
  option(5, 2, 1, 'JavaScript', 0, 'javascript'),
  option(6, 2, 2, 'TypeScript', 0, 'typescript'),
  option(7, 3, 1, '2', 0),
  option(8, 3, 2, '3', 1),
  option(9, 3, 3, 'undefined', 0),
]

export const QUESTIONNAIRE_TEST_CASES: readonly QuestionnaireTestCase[] = [
  {
    id: 1,
    questionId: 4,
    position: 1,
    arguments: [2, 3],
    expectedResult: 5,
    isHidden: false,
    description: null,
    ...stamps,
  },
  {
    id: 2,
    questionId: 4,
    position: 2,
    arguments: [-4, 4],
    expectedResult: 0,
    isHidden: false,
    description: 'nombres négatifs',
    ...stamps,
  },
  {
    id: 3,
    questionId: 4,
    position: 3,
    arguments: [100, 23],
    expectedResult: 123,
    isHidden: true,
    description: null,
    ...stamps,
  },
]
