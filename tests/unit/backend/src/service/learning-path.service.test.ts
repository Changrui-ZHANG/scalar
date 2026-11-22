import { describe, expect, it } from 'vitest'

import { chapter, exercise, track } from '../../../../fixtures/backend/content.fixtures.ts'
import type { ExerciseProgress } from '../../../../../backend/src/entity/exercise-progress.entity.ts'
import type {
  Placement,
  PlacementLevel,
} from '../../../../../backend/src/entity/placement.entity.ts'
import { InMemoryExerciseRepository } from '../../../../../backend/src/repository/exercise.repository.ts'
import { InMemorySubscriptionRepository } from '../../../../../backend/src/repository/subscription.repository.ts'
import { InMemoryTrackRepository } from '../../../../../backend/src/repository/track.repository.ts'
import { InMemoryUserRepository } from '../../../../../backend/src/repository/user.repository.ts'
import { LearningPathService } from '../../../../../backend/src/service/learning-path.service.ts'
import { PremiumService } from '../../../../../backend/src/service/premium.service.ts'

// Parcours « js » : debutant 1 et 2 (gratuits), intermediaire, avance sans exercice, ecosysteme.
// Parcours « ts » : un seul chapitre, un seul exercice.
const TRACKS = [track(1, 'js', 1), track(2, 'ts', 2)]
const CHAPTERS = [
  chapter(11, 1, 'bases', 'beginner', 1),
  chapter(12, 1, 'variables', 'beginner', 2),
  chapter(13, 1, 'fonctions', 'intermediate', 1),
  chapter(14, 1, 'lecture', 'advanced', 1),
  chapter(15, 1, 'outils', 'ecosystem', 1),
  chapter(21, 2, 'types', 'beginner', 1),
]
const EXERCISES = [
  exercise(1, 11, 'e1', 1),
  exercise(2, 11, 'e2', 2),
  exercise(3, 12, 'e3', 1),
  exercise(4, 13, 'e4', 1),
  exercise(5, 15, 'e5', 1),
  exercise(6, 21, 'e6', 1),
]
const USER = '11111111-1111-4111-8111-111111111111'

const service = new LearningPathService(
  new InMemoryTrackRepository(TRACKS, CHAPTERS),
  new InMemoryExerciseRepository(EXERCISES, []),
  new PremiumService(new InMemoryUserRepository(), new InMemorySubscriptionRepository(), 2),
)

const day = (n: number) => new Date(Date.UTC(2026, 10, n))

function placement(level: PlacementLevel, trackId = 1): Placement {
  return {
    id: 1,
    score: 50,
    level,
    trackId,
    declared: 0.5,
    knowledge: 0.5,
    practical: 0.5,
    userId: USER,
    createdAt: day(1),
  }
}

function passed(exerciseId: number, at: Date): ExerciseProgress {
  return { userId: USER, exerciseId, attempts: 1, firstPassedAt: at, lastAttemptAt: at }
}

function failed(exerciseId: number, at: Date): ExerciseProgress {
  return { userId: USER, exerciseId, attempts: 2, firstPassedAt: null, lastAttemptAt: at }
}

const acquiredOf = (path: Awaited<ReturnType<typeof service.path>>) =>
  path?.chapters.filter((c) => c.acquired).map((c) => c.slug)

describe('LearningPathService.path', () => {
  it('n’a rien à conseiller sans positionnement ni tentative', async () => {
    expect(await service.path(null, [])).toBeNull()
  })

  it('suit le parcours du positionnement et marque acquis les niveaux en dessous', async () => {
    const path = await service.path(placement('intermediate'), [])

    expect(path?.track).toEqual({ slug: 'js', name: 'JS' })
    expect(path?.level).toBe('intermediate')
    expect(path?.chapters.map((c) => [c.number, c.slug, c.level, c.free, c.acquired])).toEqual([
      [1, 'bases', 'beginner', true, true],
      [2, 'variables', 'beginner', true, true],
      [3, 'fonctions', 'intermediate', false, false],
      [4, 'lecture', 'advanced', false, false],
      [5, 'outils', 'ecosystem', false, false],
    ])
  })

  it('conseille le premier exercice après les chapitres acquis, même Premium', async () => {
    expect((await service.path(placement('intermediate'), []))?.nextExercise).toEqual({
      chapter: 'fonctions',
      exercise: 'e4',
      title: 'Exercice e4',
      free: false,
    })
  })

  it('part du début pour un débutant : rien d’acquis, premier exercice gratuit', async () => {
    const path = await service.path(placement('beginner'), [])

    expect(acquiredOf(path)).toEqual([])
    expect(path?.nextExercise).toMatchObject({ chapter: 'bases', exercise: 'e1', free: true })
  })

  it('n’acquiert jamais l’écosystème, et saute un chapitre sans exercice', async () => {
    const path = await service.path(placement('advanced'), [])

    expect(acquiredOf(path)).toEqual(['bases', 'variables', 'fonctions'])
    expect(path?.nextExercise).toMatchObject({ chapter: 'outils', exercise: 'e5' })
  })

  it('saute les exercices réussis, pas ceux seulement tentés', async () => {
    const path = await service.path(placement('beginner'), [passed(1, day(2)), failed(2, day(3))])

    expect(path?.nextExercise).toMatchObject({ chapter: 'bases', exercise: 'e2' })
  })

  it('ne conseille plus rien une fois tout réussi hors des chapitres acquis', async () => {
    const path = await service.path(placement('intermediate'), [
      passed(4, day(2)),
      passed(5, day(3)),
    ])

    expect(path?.nextExercise).toBeNull()
  })

  it('dit quels chapitres sont terminés : tous leurs exercices réussis', async () => {
    const path = await service.path(placement('beginner'), [
      passed(1, day(2)),
      passed(2, day(3)),
      failed(3, day(4)),
    ])

    expect(path?.chapters.map((c) => [c.slug, c.completed])).toEqual([
      ['bases', true],
      ['variables', false],
      ['fonctions', false],
      ['lecture', false],
      ['outils', false],
    ])
  })

  it('sans positionnement, suit le parcours de la dernière tentative, sans rien d’acquis', async () => {
    const path = await service.path(null, [passed(1, day(2)), failed(6, day(5))])

    expect(path?.track.slug).toBe('ts')
    expect(path?.level).toBeNull()
    expect(acquiredOf(path)).toEqual([])
    expect(path?.nextExercise).toMatchObject({ chapter: 'types', exercise: 'e6' })
  })

  it('se rabat sur la dernière tentative quand le parcours du positionnement a disparu', async () => {
    expect(await service.path(placement('intermediate', 99), [])).toBeNull()
    expect(
      (await service.path(placement('intermediate', 99), [failed(3, day(2))]))?.track.slug,
    ).toBe('js')
  })
})

describe('LearningPathService.badges', () => {
  it('n’en donne aucun sans réussite', async () => {
    expect(await service.badges([failed(1, day(2))])).toEqual([])
  })

  it('donne le premier exercice réussi, une seule fois, daté de la première réussite', async () => {
    expect(await service.badges([passed(1, day(2))])).toEqual([
      { kind: 'first_exercise', track: null, chapter: null, earnedAt: day(2) },
    ])
    const badges = await service.badges([passed(2, day(4)), passed(1, day(2))])
    expect(badges.filter((b) => b.kind === 'first_exercise')).toEqual([
      { kind: 'first_exercise', track: null, chapter: null, earnedAt: day(2) },
    ])
  })

  it('donne un chapitre terminé à la réussite de son dernier exercice', async () => {
    const badges = await service.badges([passed(1, day(2)), passed(2, day(6))])

    expect(badges).toContainEqual({
      kind: 'chapter_completed',
      track: 'js',
      chapter: 'bases',
      earnedAt: day(6),
    })
  })

  it('donne un parcours terminé quand tous ses exercices sont réussis, par ordre de date', async () => {
    expect(await service.badges([passed(6, day(3))])).toEqual([
      { kind: 'first_exercise', track: null, chapter: null, earnedAt: day(3) },
      { kind: 'chapter_completed', track: 'ts', chapter: 'types', earnedAt: day(3) },
      { kind: 'track_completed', track: 'ts', chapter: null, earnedAt: day(3) },
    ])
  })

  it('ne termine pas un parcours dont un exercice reste à réussir', async () => {
    const badges = await service.badges([1, 2, 3, 4].map((id) => passed(id, day(id + 1))))

    expect(badges.filter((b) => b.kind === 'track_completed')).toEqual([])
    expect(badges.filter((b) => b.kind === 'chapter_completed').map((b) => b.chapter)).toEqual([
      'bases',
      'variables',
      'fonctions',
    ])
  })
})
