import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { Chapter, Exercise } from '../db/schema.ts'
import { InMemoryExerciseRepository } from '../repositories/exercise.repository.ts'
import { ExerciseService, isLanguage } from './exercise.service.ts'

const DATE = new Date('2026-09-25T00:00:00Z')

function chapter(id: number, position: number): Chapter {
  return {
    id,
    slug: `chapitre-${id}`,
    language: 'javascript',
    title: `Chapitre ${id}`,
    position,
    lesson: 'cours',
    createdAt: DATE,
    updatedAt: DATE,
  }
}

function exercise(id: number, chapterId: number, position: number): Exercise {
  return {
    id,
    slug: `exercice-${id}`,
    chapterId,
    position,
    title: `Exercice ${id}`,
    statement: 'énoncé',
    functionName: 'f',
    starterCode: 'function f() {}',
    solution: 'function f() { return 42 }',
    hints: [],
    tests: [{ args: [], expected: 42 }],
    createdAt: DATE,
    updatedAt: DATE,
  }
}

/**
 * Donnees volontairement en desordre, avec un chapitre vide au milieu : le
 * service doit trier et sauter ce qui n'a pas d'exercice.
 */
const service = new ExerciseService(
  new InMemoryExerciseRepository(
    [chapter(3, 3), chapter(1, 1), chapter(2, 2)],
    [exercise(12, 1, 2), exercise(11, 1, 1), exercise(31, 3, 1)],
  ),
)

describe('isLanguage', () => {
  it('n’accepte que les langages proposés', () => {
    assert.equal(isLanguage('javascript'), true)
    assert.equal(isLanguage('python'), false)
    assert.equal(isLanguage('JavaScript'), false)
  })
})

describe('ExerciseService.listChapters', () => {
  it('renvoie les chapitres et leurs exercices triés par position', async () => {
    const chapters = await service.listChapters('javascript')

    assert.deepEqual(
      chapters.map((c) => c.slug),
      ['chapitre-1', 'chapitre-2', 'chapitre-3'],
    )
    assert.deepEqual(
      chapters[0]?.exercises.map((e) => e.slug),
      ['exercice-11', 'exercice-12'],
    )
    assert.deepEqual(chapters[1]?.exercises, [])
  })
})

describe('ExerciseService.getChapter', () => {
  it('renvoie le rappel de cours et les exercices du chapitre', async () => {
    const detail = await service.getChapter('chapitre-1')

    assert.equal(detail?.lesson, 'cours')
    assert.equal(detail?.language, 'javascript')
    assert.equal(detail?.exercises.length, 2)
  })

  it('renvoie null pour un chapitre inconnu', async () => {
    assert.equal(await service.getChapter('inconnu'), null)
  })
})

describe('ExerciseService.getExercise', () => {
  it('ne renvoie jamais la solution', async () => {
    const detail = await service.getExercise('exercice-11')

    assert.ok(detail)
    assert.equal('solution' in detail, false)
    assert.equal(JSON.stringify(detail).includes('return 42'), false)
  })

  it('renvoie les champs utiles à l’apprenant et son chapitre', async () => {
    const detail = await service.getExercise('exercice-11')

    assert.equal(detail?.functionName, 'f')
    assert.deepEqual(detail?.tests, [{ args: [], expected: 42 }])
    assert.deepEqual(detail?.chapter, { slug: 'chapitre-1', title: 'Chapitre 1' })
  })

  it('suggère l’exercice suivant du même chapitre', async () => {
    const detail = await service.getExercise('exercice-11')
    assert.deepEqual(detail?.next, { slug: 'exercice-12', chapterSlug: 'chapitre-1' })
  })

  it('passe au premier exercice du chapitre suivant, en sautant un chapitre vide', async () => {
    const detail = await service.getExercise('exercice-12')
    assert.deepEqual(detail?.next, { slug: 'exercice-31', chapterSlug: 'chapitre-3' })
  })

  it('ne suggère rien après le dernier exercice du parcours', async () => {
    const detail = await service.getExercise('exercice-31')
    assert.equal(detail?.next, null)
  })

  it('renvoie null pour un exercice inconnu', async () => {
    assert.equal(await service.getExercise('inconnu'), null)
  })
})
