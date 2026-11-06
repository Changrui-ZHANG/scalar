import type { JsonValue } from '@scalar/shared/api'

import type { QuestionnaireOption } from '../entity/questionnaire-option.entity.ts'
import type { QuestionnaireQuestion } from '../entity/questionnaire-question.entity.ts'
import type { QuestionnaireTestCase } from '../entity/questionnaire-test-case.entity.ts'

const DATE = new Date('2026-11-04T00:00:00Z')
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
    kind: 'knowledge',
    title: 'Que produit `for (let i = 0; i < 3; i++) {}` suivi de `console.log(i)` ?',
    description: null,
    weight: 2,
    ...noCode,
    ...published,
  },
  {
    id: 5,
    position: 5,
    kind: 'knowledge',
    title: 'Que vaut `typeof null` ?',
    description: null,
    weight: 3,
    ...noCode,
    ...published,
  },
  {
    id: 6,
    position: 6,
    kind: 'code',
    title: 'Somme de deux nombres',
    description:
      'Écrivez une fonction `ajouter(a, b)` qui renvoie la somme de ses deux paramètres.\n\nExemple : `ajouter(2, 3)` renvoie `5`.',
    weight: 1,
    functionName: 'ajouter',
    starterCode: 'function ajouter(a, b) {\n  // à vous de jouer\n}\n',
    solutionCode: 'function ajouter(a, b) {\n  return a + b\n}\n',
    ...published,
  },
  {
    id: 7,
    position: 7,
    kind: 'code',
    title: 'Palindrome',
    description:
      'Écrivez une fonction `estPalindrome(chaine)` qui renvoie `true` si la chaîne se lit de la même façon dans les deux sens, `false` sinon.\n\nExemple : `estPalindrome("radar")` renvoie `true`.',
    weight: 2,
    functionName: 'estPalindrome',
    starterCode: 'function estPalindrome(chaine) {\n  // à vous de jouer\n}\n',
    solutionCode:
      'function estPalindrome(chaine) {\n  return chaine === [...chaine].reverse().join("")\n}\n',
    ...published,
  },
  {
    id: 8,
    position: 8,
    kind: 'code',
    title: 'Factorielle',
    description:
      'Écrivez une fonction `factorielle(n)` qui renvoie 1 × 2 × … × n. Par convention, `factorielle(0)` vaut `1`.',
    weight: 3,
    functionName: 'factorielle',
    starterCode: 'function factorielle(n) {\n  // à vous de jouer\n}\n',
    solutionCode: 'function factorielle(n) {\n  return n <= 1 ? 1 : n * factorielle(n - 1)\n}\n',
    ...published,
  },
]

let nextOptionId = 1
const options = (
  questionId: number,
  list: readonly (readonly [label: string, score: number, trackSlug?: string])[],
): QuestionnaireOption[] =>
  list.map(([label, score, trackSlug], i) => ({
    id: nextOptionId++,
    questionId,
    position: i + 1,
    label,
    score,
    trackSlug: trackSlug ?? null,
    ...stamps,
  }))

export const QUESTIONNAIRE_OPTIONS: readonly QuestionnaireOption[] = [
  ...options(1, [
    ['Je n’ai jamais programmé', 0],
    ['J’ai suivi quelques tutoriels', 1 / 3],
    ['J’écris de petits programmes seul', 2 / 3],
    ['Je programme régulièrement, au travail ou en projet', 1],
  ]),
  ...options(2, [
    ['JavaScript', 0, 'javascript'],
    ['TypeScript', 0, 'typescript'],
  ]),
  ...options(3, [
    ['2', 0],
    ['3', 1],
    ['4', 0],
    ['undefined', 0],
  ]),
  ...options(4, [
    ['Elle affiche 2', 0],
    ['Elle affiche 3', 0],
    ['Elle affiche undefined', 0],
    ['Une ReferenceError', 1],
  ]),
  ...options(5, [
    ['"null"', 0],
    ['"undefined"', 0],
    ['"object"', 1],
    ['"number"', 0],
  ]),
]

let nextCaseId = 1
const cases = (
  questionId: number,
  list: readonly (readonly [
    args: readonly JsonValue[],
    expected: JsonValue,
    hidden?: boolean,
    description?: string,
  ])[],
): QuestionnaireTestCase[] =>
  list.map(([args, expected, hidden, description], i) => ({
    id: nextCaseId++,
    questionId,
    position: i + 1,
    arguments: args,
    expectedResult: expected,
    isHidden: hidden ?? false,
    description: description ?? null,
    ...stamps,
  }))

export const QUESTIONNAIRE_TEST_CASES: readonly QuestionnaireTestCase[] = [
  ...cases(6, [
    [[2, 3], 5],
    [[-4, 4], 0, false, 'nombres négatifs'],
    [[0.5, 0.25], 0.75, false, 'décimaux'],
    [[100, 23], 123, true],
  ]),
  ...cases(7, [
    [['radar'], true],
    [['bonjour'], false],
    [[''], true, false, 'chaîne vide'],
    [['kayak'], true, true],
    [['ab'], false, true],
    [['abca'], false, false, 'mêmes première et dernière lettres'],
  ]),
  ...cases(8, [
    [[0], 1, false, 'par convention'],
    [[3], 6],
    [[5], 120],
    [[10], 3628800, true],
  ]),
]
