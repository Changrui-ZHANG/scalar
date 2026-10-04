import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { Chapter, Exercise, ExerciseTestCase, Language } from '../db/schema.ts'
import { InMemoryExerciseRepository } from '../repositories/exercise.repository.ts'
import { InMemoryLanguageRepository } from '../repositories/language.repository.ts'
import { ExerciseService } from './exercise.service.ts'

const DATE = new Date('2026-09-28T00:00:00Z')
const stamps = { createdAt: DATE, updatedAt: DATE }

function language(
  id: number,
  slug: string,
  position: number,
  extra: Partial<Language> = {},
): Language {
  return {
    id,
    slug,
    label: slug.toUpperCase(),
    position,
    summary: `Résumé ${slug}`,
    runtime: 'node',
    prerequisiteLanguageId: null,
    status: 'published',
    ...stamps,
    ...extra,
  }
}

function chapter(id: number, languageId: number, slug: string, position: number): Chapter {
  return {
    id,
    languageId,
    slug,
    position,
    title: `Chapitre ${slug}`,
    summary: 'résumé',
    status: 'published',
    ...stamps,
  }
}

function exercise(
  id: number,
  chapterId: number,
  slug: string,
  position: number,
  extra: Partial<Exercise> = {},
): Exercise {
  return {
    id,
    chapterId,
    slug,
    position,
    title: `Exercice ${slug}`,
    statement: 'énoncé',
    functionName: 'f',
    starterCode: 'function f() {}',
    solutionCode: 'function f() { return 42 }',
    hints: [],
    status: 'published',
    ...stamps,
    ...extra,
  }
}

function testCase(
  id: number,
  exerciseId: number,
  position: number,
  extra: Partial<ExerciseTestCase> = {},
): ExerciseTestCase {
  return {
    id,
    exerciseId,
    position,
    args: [],
    expected: 42,
    isHidden: false,
    label: null,
    ...stamps,
    ...extra,
  }
}

/**
 * Deux langages qui ont chacun un chapitre `boucles` : les slugs ne sont
 * uniques que dans leur parent. Positions en desordre et non contigues, un
 * chapitre vide, un exercice en brouillon et un cas cache.
 */
const service = new ExerciseService(
  new InMemoryLanguageRepository([
    language(2, 'beta', 20, { prerequisiteLanguageId: 1 }),
    language(1, 'alpha', 10),
    language(3, 'brouillon', 30, { status: 'draft' }),
  ]),
  new InMemoryExerciseRepository(
    [
      chapter(13, 1, 'fin', 90),
      chapter(11, 1, 'boucles', 10),
      chapter(12, 1, 'vide', 40),
      chapter(21, 2, 'boucles', 5),
    ],
    [
      exercise(102, 11, 'deux', 9),
      exercise(101, 11, 'un', 5),
      exercise(103, 11, 'cache', 7, { status: 'draft' }),
      exercise(131, 13, 'dernier', 1),
      exercise(211, 21, 'un', 1),
    ],
    [
      testCase(2, 101, 2, { args: [1], expected: 1, label: 'un' }),
      testCase(1, 101, 1),
      testCase(3, 101, 3, { isHidden: true }),
    ],
  ),
)

describe('ExerciseService.listLanguages', () => {
  it('liste les langages publiés dans l’ordre, avec leur prérequis', async () => {
    assert.deepEqual(await service.listLanguages(), [
      { slug: 'alpha', label: 'ALPHA', summary: 'Résumé alpha', prerequisite: null },
      {
        slug: 'beta',
        label: 'BETA',
        summary: 'Résumé beta',
        prerequisite: { slug: 'alpha', label: 'ALPHA' },
      },
    ])
  })
})

describe('ExerciseService.listChapters', () => {
  it('numérote chapitres et exercices selon l’ordre réel, sans les brouillons', async () => {
    const chapters = await service.listChapters('alpha')

    assert.deepEqual(
      chapters?.map((c) => [c.slug, c.number]),
      [
        ['boucles', 1],
        ['vide', 2],
        ['fin', 3],
      ],
    )
    assert.deepEqual(
      chapters?.[0]?.exercises.map((e) => [e.slug, e.number]),
      [
        ['un', 1],
        ['deux', 2],
      ],
    )
  })

  it('renvoie null pour un langage inconnu ou en brouillon', async () => {
    assert.equal(await service.listChapters('inconnu'), null)
    assert.equal(await service.listChapters('brouillon'), null)
  })
})

describe('ExerciseService.getChapter', () => {
  it('trouve un chapitre par son slug dans son langage', async () => {
    const alpha = await service.getChapter('alpha', 'boucles')
    const beta = await service.getChapter('beta', 'boucles')

    assert.equal(alpha?.exercises.length, 2)
    assert.deepEqual(alpha?.language, { slug: 'alpha', label: 'ALPHA' })
    assert.equal(beta?.exercises.length, 1)
    assert.equal(beta?.number, 1)
  })

  it('renvoie null pour un chapitre d’un autre langage', async () => {
    assert.equal(await service.getChapter('beta', 'fin'), null)
  })
})

describe('ExerciseService.getExercise', () => {
  it('ne renvoie ni la solution ni les cas cachés', async () => {
    const detail = await service.getExercise('alpha', 'boucles', 'un')

    assert.ok(detail)
    assert.equal(JSON.stringify(detail).includes('return 42'), false)
    assert.deepEqual(detail.testCases, [
      { args: [], expected: 42, label: null },
      { args: [1], expected: 1, label: 'un' },
    ])
  })

  it('situe l’exercice dans son chapitre et son langage', async () => {
    const detail = await service.getExercise('alpha', 'boucles', 'deux')

    assert.equal(detail?.number, 2)
    assert.deepEqual(detail?.chapter, { slug: 'boucles', title: 'Chapitre boucles', number: 1 })
    assert.deepEqual(detail?.language, { slug: 'alpha', label: 'ALPHA', runtime: 'node' })
  })

  it('suggère l’exercice suivant, en sautant le brouillon puis le chapitre vide', async () => {
    assert.deepEqual((await service.getExercise('alpha', 'boucles', 'un'))?.next, {
      chapterSlug: 'boucles',
      slug: 'deux',
    })
    assert.deepEqual((await service.getExercise('alpha', 'boucles', 'deux'))?.next, {
      chapterSlug: 'fin',
      slug: 'dernier',
    })
    assert.equal((await service.getExercise('alpha', 'fin', 'dernier'))?.next, null)
  })

  it('renvoie null hors de la bonne hiérarchie, ou pour un brouillon', async () => {
    assert.equal(await service.getExercise('alpha', 'fin', 'un'), null)
    assert.equal(await service.getExercise('beta', 'boucles', 'deux'), null)
    assert.equal(await service.getExercise('alpha', 'boucles', 'cache'), null)
  })
})
