import { describe, expect, it } from 'vitest'

import { InMemoryExerciseRepository } from '../repositories/exercise.repository.ts'
import { InMemoryTrackRepository } from '../repositories/track.repository.ts'
import { chapter, exercise, testCase, track } from './content.fixtures.ts'
import { ExerciseService } from './exercise.service.ts'

/**
 * Deux parcours qui ont chacun un chapitre `boucles` : les slugs ne sont
 * uniques que dans leur parent. Niveaux et positions en desordre, un chapitre
 * vide, un chapitre archive, un exercice en brouillon et un cas cache ; un
 * parcours en brouillon et un parcours sans langage, qui ne servent rien.
 */
const service = new ExerciseService(
  new InMemoryTrackRepository(
    [
      track(2, 'beta', 20, { prerequisiteTrackId: 1, programmingLanguage: 'typescript' }),
      track(1, 'alpha', 10),
      track(3, 'brouillon', 30, { status: 'draft' }),
      track(4, 'lecture', 40, { programmingLanguage: null }),
    ],
    [
      chapter(13, 1, 'fin', 'intermediate', 1),
      chapter(11, 1, 'boucles', 'beginner', 2),
      chapter(12, 1, 'vide', 'beginner', 5),
      chapter(14, 1, 'archive', 'beginner', 3, { status: 'archived' }),
      chapter(21, 2, 'boucles', 'beginner', 1),
      chapter(31, 3, 'cache', 'beginner', 1),
      chapter(41, 4, 'lire', 'beginner', 1),
    ],
  ),
  new InMemoryExerciseRepository(
    [
      exercise(102, 11, 'deux', 9),
      exercise(101, 11, 'un', 5),
      exercise(103, 11, 'cache', 7, { status: 'draft' }),
      exercise(131, 13, 'dernier', 1),
      exercise(141, 14, 'archive', 1),
      exercise(211, 21, 'un', 1),
      exercise(311, 31, 'un', 1),
      exercise(411, 41, 'egare', 1),
    ],
    [
      testCase(2, 101, 2, { arguments: [1], expectedResult: 1, description: 'un' }),
      testCase(1, 101, 1),
      testCase(3, 101, 3, { isHidden: true }),
    ],
  ),
)

describe('ExerciseService.getExercise', () => {
  it('ne renvoie ni la solution ni les cas cachés', async () => {
    const detail = await service.getExercise('alpha', 'boucles', 'un')

    expect(detail).toBeDefined()
    expect(JSON.stringify(detail).includes('return 42')).toBe(false)
    expect(JSON.stringify(detail).includes('solution')).toBe(false)
    expect(detail?.testCases).toEqual([
      { arguments: [], expectedResult: 42, description: null },
      { arguments: [1], expectedResult: 1, description: 'un' },
    ])
  })

  it('situe l’exercice dans son chapitre et son parcours', async () => {
    const detail = await service.getExercise('alpha', 'boucles', 'deux')

    expect(detail?.number).toBe(2)
    expect(detail?.instructions).toBe('consigne')
    expect(detail?.chapter).toEqual({ slug: 'boucles', title: 'Chapitre boucles', number: 1 })
    expect(detail?.track).toEqual({
      slug: 'alpha',
      name: 'ALPHA',
      programmingLanguage: 'javascript',
    })
    const beta = await service.getExercise('beta', 'boucles', 'un')
    expect(beta?.track.programmingLanguage).toBe('typescript')
  })

  it('numérote le chapitre par niveau puis position, jamais par `position`', async () => {
    const detail = await service.getExercise('alpha', 'fin', 'dernier')
    expect(detail?.chapter.number).toBe(3)
  })

  it('suggère l’exercice suivant, en sautant brouillon, chapitre archivé et chapitre vide', async () => {
    expect((await service.getExercise('alpha', 'boucles', 'un'))?.next).toEqual({
      chapterSlug: 'boucles',
      slug: 'deux',
    })
    expect((await service.getExercise('alpha', 'boucles', 'deux'))?.next).toEqual({
      chapterSlug: 'fin',
      slug: 'dernier',
    })
    expect((await service.getExercise('alpha', 'fin', 'dernier'))?.next).toBeNull()
  })

  it('renvoie null hors de la bonne hiérarchie, ou si un parent n’est pas publié', async () => {
    expect(await service.getExercise('alpha', 'fin', 'un')).toBeNull()
    expect(await service.getExercise('beta', 'boucles', 'deux')).toBeNull()
    expect(await service.getExercise('alpha', 'boucles', 'cache')).toBeNull()
    expect(await service.getExercise('alpha', 'archive', 'archive')).toBeNull()
    expect(await service.getExercise('brouillon', 'cache', 'un')).toBeNull()
  })

  it('ne sert aucun exercice d’un parcours sans langage', async () => {
    expect(await service.getExercise('lecture', 'lire', 'egare')).toBeNull()
  })
})

describe('ExerciseService.findForVerification', () => {
  it('garde les cas cachés et le langage, pour la correction côté serveur', async () => {
    const target = await service.findForVerification('alpha', 'boucles', 'un')

    expect(target?.programmingLanguage).toBe('javascript')
    expect(target?.functionName).toBe('f')
    expect(target?.cases.map((c) => [c.arguments, c.expectedResult, c.isHidden])).toEqual([
      [[], 42, false],
      [[1], 1, false],
      [[], 42, true],
    ])
  })

  it('renvoie null pour un exercice non servi', async () => {
    expect(await service.findForVerification('alpha', 'archive', 'archive')).toBeNull()
    expect(await service.findForVerification('lecture', 'lire', 'egare')).toBeNull()
  })
})
