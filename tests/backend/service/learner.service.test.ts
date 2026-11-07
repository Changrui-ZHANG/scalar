import { describe, expect, it } from 'vitest'

import { InMemoryCertificateRepository } from '../../../backend/src/repository/certificate.repository.ts'
import { InMemoryExerciseRepository } from '../../../backend/src/repository/exercise.repository.ts'
import { InMemoryPlacementRepository } from '../../../backend/src/repository/placement.repository.ts'
import { InMemoryProgressRepository } from '../../../backend/src/repository/progress.repository.ts'
import { InMemoryTrackRepository } from '../../../backend/src/repository/track.repository.ts'
import { InMemoryUserRepository } from '../../../backend/src/repository/user.repository.ts'
import { EXERCISES } from '../../../backend/src/content/exercises.ts'
import { CertificateService } from '../../../backend/src/service/certificate.service.ts'
import { LearnerService } from '../../../backend/src/service/learner.service.ts'

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
    const service = new LearnerService(users, progress, tracks, exercises, placements, certificates)
    return { service, progress, placements }
  }

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
    new InMemoryPlacementRepository(),
    new CertificateService(new InMemoryCertificateRepository(), users, progress, tracks, exercises),
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
