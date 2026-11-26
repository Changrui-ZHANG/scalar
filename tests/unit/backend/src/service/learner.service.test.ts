import { describe, expect, it } from 'vitest'

import { InMemoryCertificateRepository } from '../../../../../backend/src/repository/certificate.repository.ts'
import { InMemoryExerciseRepository } from '../../../../../backend/src/repository/exercise.repository.ts'
import { InMemoryLessonRepository } from '../../../../../backend/src/repository/lesson.repository.ts'
import { InMemoryPlacementRepository } from '../../../../../backend/src/repository/placement.repository.ts'
import { InMemoryProgressRepository } from '../../../../../backend/src/repository/progress.repository.ts'
import { InMemorySubscriptionRepository } from '../../../../../backend/src/repository/subscription.repository.ts'
import { InMemoryTrackRepository } from '../../../../../backend/src/repository/track.repository.ts'
import { InMemoryUserRepository } from '../../../../../backend/src/repository/user.repository.ts'
import { EXERCISES } from '../../../../../backend/src/content/exercises.ts'
import { CertificateService } from '../../../../../backend/src/service/certificate.service.ts'
import { LearnerService } from '../../../../../backend/src/service/learner.service.ts'
import { LearningPathService } from '../../../../../backend/src/service/learning-path.service.ts'
import { PremiumService } from '../../../../../backend/src/service/premium.service.ts'

describe('LearnerService.getProgress', () => {
  const open = () => {
    const users = new InMemoryUserRepository()
    const progress = new InMemoryProgressRepository()
    const placements = new InMemoryPlacementRepository()
    const tracks = new InMemoryTrackRepository()
    const exercises = new InMemoryExerciseRepository()
    const certificates = new CertificateService(
      new InMemoryCertificateRepository(),
      users,
      progress,
      tracks,
      exercises,
    )
    const path = new LearningPathService(
      tracks,
      exercises,
      new PremiumService(users, new InMemorySubscriptionRepository(), 2),
    )
    const lessons = new InMemoryLessonRepository()
    const service = new LearnerService(
      users,
      progress,
      tracks,
      exercises,
      lessons,
      placements,
      certificates,
      path,
    )
    return { service, progress, placements, users, tracks, lessons }
  }

  it('ajoute le parcours conseillé et les badges à la progression', async () => {
    const { service, placements } = open()
    const { id } = await service.createLearner()
    const saved = await placements.save({
      score: 30,
      level: 'beginner',
      trackId: 1,
      declared: 0,
      knowledge: 0,
      practical: 0,
      createdAt: new Date('2026-11-06T10:00:00Z'),
    })
    await placements.assignToUser(saved.id, id)
    await service.recordAttempt(id, 1, true)

    const result = await service.getProgress(id)

    expect(result?.path?.track.slug).toBe('javascript')
    expect(result?.path?.nextExercise).toMatchObject({
      chapter: 'variables',
      exercise: 'aire-rectangle',
      free: true,
    })
    expect(result?.badges.map((b) => b.kind)).toEqual(['first_exercise'])
  })

  it('n’affiche plus un exercice retiré du catalogue depuis la tentative', async () => {
    const { service, progress } = open()
    const { id } = await service.createLearner()
    const [served] = EXERCISES
    await service.recordAttempt(id, served!.id, true)
    await progress.recordAttempt(id, 9_999, true, new Date())

    const result = await service.getProgress(id)

    expect(result?.passedCount).toBe(1)
    expect(result?.exercises.map((e) => e.exercise)).toEqual([served!.slug])
  })

  it('garde le niveau d’un questionnaire dont le parcours a été retiré depuis', async () => {
    const { service, placements } = open()
    const { id } = await service.createLearner()
    const at = new Date('2026-11-06T10:00:00Z')
    const saved = await placements.save({
      score: 74,
      level: 'intermediate',
      trackId: 9_999,
      declared: 1,
      knowledge: 1,
      practical: 0.5,
      createdAt: at,
    })
    await placements.assignToUser(saved.id, id)

    expect((await service.getProgress(id))?.placement).toEqual({
      score: 74,
      level: 'intermediate',
      track: null,
      createdAt: at,
    })
  })
})

describe('LearnerService.access', () => {
  const users = new InMemoryUserRepository()
  const progress = new InMemoryProgressRepository()
  const tracks = new InMemoryTrackRepository()
  const exercises = new InMemoryExerciseRepository()
  const service = new LearnerService(
    users,
    progress,
    tracks,
    exercises,
    new InMemoryLessonRepository(),
    new InMemoryPlacementRepository(),
    new CertificateService(new InMemoryCertificateRepository(), users, progress, tracks, exercises),
    new LearningPathService(
      tracks,
      exercises,
      new PremiumService(users, new InMemorySubscriptionRepository(), 2),
    ),
  )
  const account = { email: 'ada@example.org', passwordHash: 'hash' }

  it('ouvre un apprenant anonyme à qui connaît son identifiant, avec ou sans session', async () => {
    const { id } = await users.createAnonymous()
    const other = await users.create({ ...account, email: 'autre@example.org' })

    expect(await service.access(id, null)).toBe('allowed')
    expect(await service.access(id, other!.id)).toBe('allowed')
  })

  it('n’ouvre un compte inscrit qu’à sa propre session', async () => {
    const ada = (await users.create(account))!
    const other = (await users.create({ ...account, email: 'eve@example.org' }))!

    expect(await service.access(ada.id, ada.id)).toBe('allowed')
    expect(await service.access(ada.id, null)).toBe('unauthenticated')
    expect(await service.access(ada.id, other.id)).toBe('forbidden')
  })

  it('signale un identifiant inconnu ou mal formé', async () => {
    expect(await service.access('00000000-0000-4000-8000-000000000000', null)).toBe('not-found')
    expect(await service.access('pas-un-uuid', null)).toBe('not-found')
  })
})

describe('LearnerService : leçons terminées et fusion à la connexion', () => {
  const open = () => {
    const users = new InMemoryUserRepository()
    const progress = new InMemoryProgressRepository()
    const placements = new InMemoryPlacementRepository()
    const tracks = new InMemoryTrackRepository()
    const exercises = new InMemoryExerciseRepository()
    const lessons = new InMemoryLessonRepository()
    const service = new LearnerService(
      users,
      progress,
      tracks,
      exercises,
      lessons,
      placements,
      new CertificateService(new InMemoryCertificateRepository(), users, progress, tracks, exercises),
      new LearningPathService(
        tracks,
        exercises,
        new PremiumService(users, new InMemorySubscriptionRepository(), 2),
      ),
    )
    return { service, users, progress, placements, tracks, lessons }
  }

  // Première leçon publiée du premier parcours : de quoi l'adresser par ses slugs.
  const firstLesson = async (
    tracks: InMemoryTrackRepository,
    lessons: InMemoryLessonRepository,
  ) => {
    const [track] = await tracks.listTracks()
    const [chapter] = await tracks.listChapters(track!.id)
    const [lesson] = await lessons.listLessons(chapter!.id)
    return { track: track!, chapter: chapter!, lesson: lesson! }
  }

  it('enregistre une leçon terminée et garde sa première date', async () => {
    const { service, tracks, lessons } = open()
    const { id } = await service.createLearner()
    const { track, chapter, lesson } = await firstLesson(tracks, lessons)

    const first = await service.completeLesson(id, track.slug, chapter.slug, lesson.slug)
    const again = await service.completeLesson(id, track.slug, chapter.slug, lesson.slug)
    const progress = await service.getProgress(id)

    expect(again?.completedAt).toEqual(first?.completedAt)
    expect(progress?.lessons).toEqual([
      {
        track: track.slug,
        chapter: chapter.slug,
        lesson: lesson.slug,
        title: lesson.title,
        completedAt: first?.completedAt,
      },
    ])
  })

  it('renvoie null pour une leçon introuvable', async () => {
    const { service } = open()
    const { id } = await service.createLearner()

    expect(await service.completeLesson(id, 'javascript', 'inconnu', 'rien')).toBeNull()
  })

  it('fusionne la progression anonyme dans le compte puis supprime l’anonyme', async () => {
    const { service, users, progress, placements, tracks, lessons } = open()
    const account = await users.create({ email: 'ada@exemple.fr', passwordHash: 'h' })
    const { id: anonymousId } = await service.createLearner()
    const { track, chapter, lesson } = await firstLesson(tracks, lessons)

    // Le compte avait déjà tenté l'exercice 1 sans le réussir ; l'anonyme l'a réussi.
    await progress.recordAttempt(account!.id, 1, false, new Date('2026-11-01T10:00:00Z'))
    await progress.recordAttempt(anonymousId, 1, true, new Date('2026-11-02T10:00:00Z'))
    await service.completeLesson(anonymousId, track.slug, chapter.slug, lesson.slug)
    const placement = await placements.save({
      score: 40,
      level: 'beginner',
      trackId: track.id,
      declared: 0,
      knowledge: 0,
      practical: 0,
      createdAt: new Date('2026-11-02T09:00:00Z'),
    })
    await placements.assignToUser(placement.id, anonymousId)

    await service.mergeAnonymous(anonymousId, account!.id)

    const merged = await progress.findProgress(account!.id, 1)
    expect(merged?.attempts).toBe(2)
    expect(merged?.firstPassedAt).toEqual(new Date('2026-11-02T10:00:00Z'))
    expect((await progress.listLessonCompletions(account!.id)).map((l) => l.lessonId)).toEqual([
      lesson.id,
    ])
    expect((await placements.findLatestByUser(account!.id))?.id).toBe(placement.id)
    expect(await users.findById(anonymousId)).toBeNull()
  })

  it('ne touche jamais à un compte inscrit', async () => {
    const { service, users, progress } = open()
    const other = await users.create({ email: 'autre@exemple.fr', passwordHash: 'h' })
    const account = await users.create({ email: 'ada@exemple.fr', passwordHash: 'h' })
    await progress.recordAttempt(other!.id, 1, true, new Date())

    await service.mergeAnonymous(other!.id, account!.id)

    expect(await users.findById(other!.id)).not.toBeNull()
    expect(await progress.findProgress(account!.id, 1)).toBeNull()
  })
})
