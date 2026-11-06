import { describe, expect, it } from 'vitest'

import { InMemoryExerciseRepository } from '../../../backend/src/repository/exercise.repository.ts'
import { InMemoryPlacementRepository } from '../../../backend/src/repository/placement.repository.ts'
import { InMemoryProgressRepository } from '../../../backend/src/repository/progress.repository.ts'
import { InMemoryTrackRepository } from '../../../backend/src/repository/track.repository.ts'
import { InMemoryUserRepository } from '../../../backend/src/repository/user.repository.ts'
import { EXERCISES } from '../../../backend/src/content/exercises.ts'
import { LearnerService } from '../../../backend/src/service/learner.service.ts'

describe('LearnerService.getProgress', () => {
  const open = () => {
    const progress = new InMemoryProgressRepository()
    const placements = new InMemoryPlacementRepository()
    const service = new LearnerService(
      new InMemoryUserRepository(),
      progress,
      new InMemoryTrackRepository(),
      new InMemoryExerciseRepository(),
      placements,
    )
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
