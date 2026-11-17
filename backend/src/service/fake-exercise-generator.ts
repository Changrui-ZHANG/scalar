import { MAX_EXERCISE_TITLE_LENGTH } from '@scalar/shared/limits'
import { slugify } from '@scalar/shared/slug'

import type { ExerciseBrief, ExerciseGenerator, GeneratedExercise } from './exercise-generator.ts'

// Sous la limite de 64 du slug : la place d'un suffixe -2, -3 si le slug est deja pris.
const MAX_FAKE_SLUG_LENGTH = 60

const CODE = {
  javascript: {
    starter: 'function sommePairs(nombres) {\n  // à toi\n}\n',
    solution:
      'function sommePairs(nombres) {\n  let somme = 0\n  for (const n of nombres) {\n    if (n % 2 === 0) somme += n\n  }\n  return somme\n}\n',
  },
  typescript: {
    starter: 'function sommePairs(nombres: number[]): number {\n  // à toi\n}\n',
    solution:
      'function sommePairs(nombres: number[]): number {\n  let somme = 0\n  for (const n of nombres) {\n    if (n % 2 === 0) somme += n\n  }\n  return somme\n}\n',
  },
} as const

/** Sans cle d'API, hors production : un exercice d'exemple fixe, gratuit et hors ligne. */
export class FakeExerciseGenerator implements ExerciseGenerator {
  async generate(brief: ExerciseBrief): Promise<GeneratedExercise> {
    const slug =
      slugify(brief.topic).slice(0, MAX_FAKE_SLUG_LENGTH).replace(/-+$/, '') || 'exercice-exemple'
    const code = CODE[brief.language]
    return {
      slug,
      title: brief.topic.slice(0, MAX_EXERCISE_TITLE_LENGTH).trim(),
      instructions: [
        '> **Exercice d’exemple**, créé sans IA : ajoutez `ANTHROPIC_API_KEY` dans `.env.local`',
        '> pour que Claude rédige un exercice sur ce titre.',
        '',
        'Écris une fonction `sommePairs(nombres)` qui renvoie la somme des nombres **pairs** du',
        'tableau `nombres`.',
        '',
        'Exemple : `sommePairs([1, 2, 3, 4])` renvoie `6`.',
      ].join('\n'),
      functionName: 'sommePairs',
      starterCode: code.starter,
      solutionCode: code.solution,
      hints: ['Pars d’une somme à 0.', 'Un nombre `n` est pair quand `n % 2 === 0`.'],
      testCases: [
        { arguments: [[1, 2, 3, 4]], expectedResult: 6, isHidden: false, description: null },
        { arguments: [[]], expectedResult: 0, isHidden: false, description: 'tableau vide' },
        { arguments: [[1, 3, 5]], expectedResult: 0, isHidden: true, description: 'aucun pair' },
        { arguments: [[-2, 4]], expectedResult: 2, isHidden: true, description: 'négatifs' },
      ],
    }
  }
}
