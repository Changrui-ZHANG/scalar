import type { VerificationCase } from '../services/verification.service.ts'

/**
 * Tests unitaires des exercices du questionnaire de positionnement, indexes
 * par le nom de la fonction demandee (unique d'un ensemble a l'autre).
 *
 * Ils restent cote serveur : le navigateur ne recoit que le verdict, et les
 * cas caches ne sont jamais decrits. `lessons` renvoie aux slugs des lecons
 * JavaScript a revoir quand l'exercice echoue (voir `lesson.mock.ts`).
 */
export interface QuestionnaireExercise {
  readonly cases: readonly VerificationCase[]
  readonly lessons: readonly string[]
}

const visible = (args: readonly unknown[], expected: unknown, label: string | null = null): VerificationCase => ({
  args,
  expected,
  label,
  isHidden: false,
})

const hidden = (args: readonly unknown[], expected: unknown): VerificationCase => ({
  args,
  expected,
  label: null,
  isHidden: true,
})

export const QUESTIONNAIRE_EXERCISES: Readonly<Record<string, QuestionnaireExercise>> = {
  // Ensemble 1
  ajouter: {
    cases: [
      visible([2, 3], 5),
      visible([-4, 4], 0, 'nombres négatifs'),
      visible([0.5, 0.25], 0.75, 'décimaux'),
      hidden([100, 23], 123),
    ],
    lessons: ['fonctions'],
  },
  estPalindrome: {
    cases: [
      visible(['radar'], true),
      visible(['bonjour'], false),
      visible([''], true, 'chaîne vide'),
      hidden(['kayak'], true),
      hidden(['ab'], false),
    ],
    lessons: ['boucles', 'conditions'],
  },
  factorielle: {
    cases: [
      visible([0], 1, 'par convention'),
      visible([1], 1),
      visible([5], 120),
      hidden([10], 3628800),
    ],
    lessons: ['boucles', 'fonctions'],
  },

  // Ensemble 2
  estPair: {
    cases: [
      visible([4], true),
      visible([3], false),
      visible([0], true, 'zéro est pair'),
      hidden([-2], true),
      hidden([7], false),
    ],
    lessons: ['conditions'],
  },
  dernierElement: {
    cases: [
      visible([[1, 2, 3]], 3),
      visible([['a']], 'a', 'un seul élément'),
      visible([[]], undefined, 'tableau vide'),
      hidden([[true, false]], false),
    ],
    lessons: ['variables-et-types-primitifs', 'conditions'],
  },
  fibonacci: {
    cases: [
      visible([0], 0),
      visible([1], 1),
      visible([6], 8),
      hidden([10], 55),
      hidden([20], 6765),
    ],
    lessons: ['boucles', 'fonctions'],
  },

  // Ensemble 3
  maxOfTwo: {
    cases: [
      visible([5, 3], 5),
      visible([-2, -7], -2, 'nombres négatifs'),
      visible([4, 4], 4, 'égalité'),
      hidden([1, 9], 9),
    ],
    lessons: ['conditions'],
  },
  moyenne: {
    cases: [
      visible([[1, 2, 3, 4, 5]], 3),
      visible([[]], 0, 'tableau vide'),
      visible([[2, 3]], 2.5),
      hidden([[10]], 10),
    ],
    lessons: ['boucles', 'conditions'],
  },
  trierCroissant: {
    cases: [
      visible([[3, 1, 4, 1, 5]], [1, 1, 3, 4, 5]),
      visible([[]], [], 'tableau vide'),
      visible([[10, 9, 100]], [9, 10, 100], 'tri numérique, pas alphabétique'),
      hidden([[-1, -5, 0]], [-5, -1, 0]),
    ],
    lessons: ['boucles', 'fonctions-flechees-et-closures'],
  },

  // Ensemble 4
  compterVoyelles: {
    cases: [
      visible(['bonjour'], 3),
      visible(['rythm'], 0, 'aucune voyelle'),
      visible([''], 0, 'chaîne vide'),
      hidden(['aeiou'], 5),
    ],
    lessons: ['boucles', 'conditions'],
  },
  inverserChaine: {
    cases: [
      visible(['bonjour'], 'ruojnob'),
      visible([''], '', 'chaîne vide'),
      visible(['a'], 'a'),
      hidden(['abc'], 'cba'),
    ],
    lessons: ['boucles'],
  },
  pairsJusquaN: {
    cases: [
      visible([6], [0, 2, 4, 6]),
      visible([0], [0]),
      visible([5], [0, 2, 4], 'n impair'),
      hidden([1], [0]),
    ],
    lessons: ['boucles', 'conditions'],
  },

  // Ensemble 5
  enSecondes: {
    cases: [
      visible([1, 30, 0], 5400),
      visible([0, 0, 0], 0),
      visible([0, 1, 1], 61),
      hidden([2, 0, 5], 7205),
    ],
    lessons: ['variables-et-types-primitifs', 'fonctions'],
  },
  contientDoublons: {
    cases: [
      visible([[1, 2, 3, 4]], false),
      visible([[1, 2, 2, 3]], true),
      visible([[]], false, 'tableau vide'),
      hidden([['a', 'b', 'a']], true),
    ],
    lessons: ['boucles', 'conditions'],
  },
  pgcd: {
    cases: [
      visible([48, 18], 6),
      visible([7, 3], 1, 'nombres premiers entre eux'),
      visible([10, 0], 10),
      hidden([100, 75], 25),
    ],
    lessons: ['boucles', 'fonctions'],
  },
}

export function findQuestionnaireExercise(functionName: string): QuestionnaireExercise | null {
  return Object.hasOwn(QUESTIONNAIRE_EXERCISES, functionName)
    ? QUESTIONNAIRE_EXERCISES[functionName]!
    : null
}
