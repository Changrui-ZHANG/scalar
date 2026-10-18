import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { InMemoryLessonRepository } from '../repositories/lesson.repository.ts'
import { InMemoryTrackRepository } from '../repositories/track.repository.ts'
import { chapter, lesson, track } from './content.fixtures.ts'
import { LessonService } from './lesson.service.ts'

// Donnees fictives reelles : trois parcours, un chapitre et sa lecon en brouillon.
const service = new LessonService(new InMemoryTrackRepository(), new InMemoryLessonRepository())

describe('LessonService.getLesson', () => {
  it('sert la leçon avec son cours, son parcours et son chapitre', async () => {
    const detail = await service.getLesson('typescript', 'types-de-base', 'interfaces')

    assert.equal(detail?.slug, 'interfaces')
    assert.equal(typeof detail?.body, 'string')
    assert.equal(detail?.number, 2)
    assert.deepEqual(detail?.track, { slug: 'typescript', name: 'TypeScript' })
    // Deuxieme debutant du parcours : son numero est son rang, pas sa position.
    assert.deepEqual(detail?.chapter, {
      slug: 'types-de-base',
      title: 'Types de base',
      number: 2,
    })
  })

  it('numérote le chapitre par niveau puis position', async () => {
    const detail = await service.getLesson('javascript', 'dotenv', 'dotenv')
    assert.equal(detail?.chapter.number, 12)
  })

  it('expose la date de relecture en ISO, ou null', async () => {
    const reviewed = await service.getLesson('javascript', 'dotenv', 'dotenv')
    const fresh = await service.getLesson('javascript', 'boucles', 'boucles')

    assert.equal(reviewed?.lastReviewedAt, '2026-09-01T00:00:00.000Z')
    assert.equal(fresh?.lastReviewedAt, null)
  })

  it('sert une leçon d’un parcours sans langage', async () => {
    const detail = await service.getLesson(
      'conception',
      'bases-de-la-conception',
      'architecture-mvc',
    )
    assert.equal(detail?.number, 2)
    assert.equal(detail?.chapter.number, 1)
  })

  it('renvoie null pour un brouillon, ou hors de son chapitre ou de son parcours', async () => {
    assert.equal(await service.getLesson('javascript', 'modules', 'modules'), null)
    assert.equal(await service.getLesson('javascript', 'conditions', 'boucles'), null)
    assert.equal(await service.getLesson('typescript', 'boucles', 'boucles'), null)
    assert.equal(await service.getLesson('python', 'boucles', 'boucles'), null)
  })

  it('masque une leçon publiée dont un parent ne l’est pas', async () => {
    const isolated = new LessonService(
      new InMemoryTrackRepository(
        [track(1, 'publie', 1), track(2, 'brouillon', 2, { status: 'draft' })],
        [
          chapter(11, 1, 'archive', 'beginner', 1, { status: 'archived' }),
          chapter(21, 2, 'ouvert', 'beginner', 1),
        ],
      ),
      new InMemoryLessonRepository([lesson(1, 11, 'cachee', 1), lesson(2, 21, 'cachee', 1)]),
    )
    assert.equal(await isolated.getLesson('publie', 'archive', 'cachee'), null)
    assert.equal(await isolated.getLesson('brouillon', 'ouvert', 'cachee'), null)
  })
})
