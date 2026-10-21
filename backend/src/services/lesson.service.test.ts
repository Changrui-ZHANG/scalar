import { describe, expect, it } from 'vitest'

import { InMemoryLessonRepository } from '../repositories/lesson.repository.ts'
import { InMemoryTrackRepository } from '../repositories/track.repository.ts'
import { chapter, lesson, track } from './content.fixtures.ts'
import { LessonService } from './lesson.service.ts'

// Donnees fictives reelles : trois parcours, un chapitre et sa lecon en brouillon.
const service = new LessonService(new InMemoryTrackRepository(), new InMemoryLessonRepository())

describe('LessonService.getLesson', () => {
  it('sert la leçon avec son cours, son parcours et son chapitre', async () => {
    const detail = await service.getLesson('typescript', 'types-de-base', 'interfaces')

    expect(detail?.slug).toBe('interfaces')
    expect(typeof detail?.body).toBe('string')
    expect(detail?.number).toBe(2)
    expect(detail?.track).toEqual({ slug: 'typescript', name: 'TypeScript' })
    // Deuxieme debutant du parcours : son numero est son rang, pas sa position.
    expect(detail?.chapter).toEqual({
      slug: 'types-de-base',
      title: 'Types de base',
      number: 2,
    })
  })

  it('numérote le chapitre par niveau puis position', async () => {
    const detail = await service.getLesson('javascript', 'dotenv', 'dotenv')
    expect(detail?.chapter.number).toBe(12)
  })

  it('expose la date de relecture en ISO, ou null', async () => {
    const reviewed = await service.getLesson('javascript', 'dotenv', 'dotenv')
    const fresh = await service.getLesson('javascript', 'boucles', 'boucles')

    expect(reviewed?.lastReviewedAt).toBe('2026-09-01T00:00:00.000Z')
    expect(fresh?.lastReviewedAt).toBeNull()
  })

  it('sert une leçon d’un parcours sans langage', async () => {
    const detail = await service.getLesson(
      'conception',
      'bases-de-la-conception',
      'architecture-mvc',
    )
    expect(detail?.number).toBe(2)
    expect(detail?.chapter.number).toBe(1)
  })

  it('renvoie null pour un brouillon, ou hors de son chapitre ou de son parcours', async () => {
    expect(await service.getLesson('javascript', 'modules', 'modules')).toBeNull()
    expect(await service.getLesson('javascript', 'conditions', 'boucles')).toBeNull()
    expect(await service.getLesson('typescript', 'boucles', 'boucles')).toBeNull()
    expect(await service.getLesson('python', 'boucles', 'boucles')).toBeNull()
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
    expect(await isolated.getLesson('publie', 'archive', 'cachee')).toBeNull()
    expect(await isolated.getLesson('brouillon', 'ouvert', 'cachee')).toBeNull()
  })
})
