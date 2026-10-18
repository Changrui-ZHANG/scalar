import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { InMemoryExerciseRepository } from '../repositories/exercise.repository.ts'
import { InMemoryLessonRepository } from '../repositories/lesson.repository.ts'
import { InMemoryTrackRepository } from '../repositories/track.repository.ts'
import { chapter, exercise, lesson, track } from './content.fixtures.ts'
import { TrackService } from './track.service.ts'

// Donnees fictives reelles : trois parcours, dont Conception sans langage.
const service = new TrackService(
  new InMemoryTrackRepository(),
  new InMemoryLessonRepository(),
  new InMemoryExerciseRepository(),
)

describe('TrackService.listTracks', () => {
  it('liste les parcours publiés dans l’ordre, avec langage et prérequis', async () => {
    assert.deepEqual(await service.listTracks(), [
      {
        slug: 'javascript',
        name: 'JavaScript',
        summary: 'Le point de départ : variables, conditions, boucles, fonctions.',
        programmingLanguage: 'javascript',
        prerequisite: null,
      },
      {
        slug: 'typescript',
        name: 'TypeScript',
        summary: 'JavaScript avec des types vérifiés. Suppose les bases de JavaScript.',
        programmingLanguage: 'typescript',
        prerequisite: { slug: 'javascript', name: 'JavaScript' },
      },
      {
        slug: 'conception',
        name: 'Conception',
        summary: 'Bien nommer, bien découper : les principes qui valent quel que soit le langage.',
        programmingLanguage: null,
        prerequisite: null,
      },
    ])
  })

  it('ne cite pas un prérequis non publié', async () => {
    const isolated = new TrackService(
      new InMemoryTrackRepository(
        [track(1, 'base', 1, { status: 'draft' }), track(2, 'suite', 2, { prerequisiteTrackId: 1 })],
        [],
      ),
      new InMemoryLessonRepository([]),
      new InMemoryExerciseRepository([], []),
    )
    assert.deepEqual(
      (await isolated.listTracks()).map((t) => [t.slug, t.prerequisite]),
      [['suite', null]],
    )
  })
})

describe('TrackService.getTrack', () => {
  it('ordonne les chapitres par niveau puis position, numérotés de 1 à n', async () => {
    const view = await service.getTrack('javascript')

    assert.deepEqual(view?.track, {
      slug: 'javascript',
      name: 'JavaScript',
      programmingLanguage: 'javascript',
    })
    assert.deepEqual(
      view?.chapters.map((c) => [c.number, c.level, c.slug]),
      [
        [1, 'beginner', 'syntaxe-et-nommage'],
        [2, 'beginner', 'variables'],
        [3, 'beginner', 'conditions'],
        [4, 'beginner', 'boucles'],
        [5, 'beginner', 'fonctions'],
        [6, 'beginner', 'erreurs'],
        [7, 'beginner', 'classes'],
        [8, 'intermediate', 'fonctions-flechees-et-closures'],
        [9, 'intermediate', 'asynchrone'],
        [10, 'advanced', 'prototypes'],
        [11, 'advanced', 'proxy-et-reflect'],
        [12, 'ecosystem', 'dotenv'],
        [13, 'ecosystem', 'express'],
      ],
    )
  })

  it('donne à chaque chapitre ses leçons puis ses exercices, dans l’ordre', async () => {
    const view = await service.getTrack('typescript')
    const typesDeBase = view?.chapters.find((c) => c.slug === 'types-de-base')

    assert.deepEqual(
      typesDeBase?.lessons.map((l) => l.slug),
      ['annotations', 'interfaces'],
    )
    assert.deepEqual(
      typesDeBase?.exercises.map((e) => e.slug),
      ['presenter', 'moyenne'],
    )
    assert.equal(typeof typesDeBase?.exercises[0]?.instructions, 'string')
  })

  it('sert un parcours sans langage : des leçons, aucun exercice', async () => {
    const view = await service.getTrack('conception')

    assert.equal(view?.track.programmingLanguage, null)
    assert.deepEqual(
      view?.chapters.map((c) => [c.slug, c.lessons.map((l) => l.slug), c.exercises.length]),
      [['bases-de-la-conception', ['nommage-et-lisibilite', 'architecture-mvc'], 0]],
    )
  })

  it('masque un élément dont un parent n’est pas publié', async () => {
    const isolated = new TrackService(
      new InMemoryTrackRepository(
        [track(1, 'publie', 1), track(2, 'brouillon', 2, { status: 'draft' })],
        [
          chapter(11, 1, 'ouvert', 'beginner', 1),
          chapter(12, 1, 'archive', 'beginner', 2, { status: 'archived' }),
          chapter(21, 2, 'ouvert', 'beginner', 1),
        ],
      ),
      new InMemoryLessonRepository([
        lesson(1, 11, 'lue', 1),
        lesson(2, 11, 'brouillon', 2, { status: 'draft' }),
        lesson(3, 12, 'cachee', 1),
      ]),
      new InMemoryExerciseRepository([exercise(1, 12, 'cache', 1)], []),
    )
    const view = await isolated.getTrack('publie')

    assert.deepEqual(
      view?.chapters.map((c) => [c.slug, c.lessons.map((l) => l.slug), c.exercises.length]),
      [['ouvert', ['lue'], 0]],
    )
    assert.equal(await isolated.getTrack('brouillon'), null)
  })

  it('renvoie null pour un parcours inconnu', async () => {
    assert.equal(await service.getTrack('python'), null)
  })
})
