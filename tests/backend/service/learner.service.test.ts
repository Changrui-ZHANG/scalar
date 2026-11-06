import { describe, expect, it } from 'vitest'

import { InMemoryExerciseRepository } from '../../../backend/src/repository/exercise.repository.ts'
import { InMemoryProgressRepository } from '../../../backend/src/repository/progress.repository.ts'
import { InMemoryTrackRepository } from '../../../backend/src/repository/track.repository.ts'
import { InMemoryUserRepository } from '../../../backend/src/repository/user.repository.ts'
import { EXERCISES } from '../../../backend/src/content/exercises.ts'
import { LearnerService } from '../../../backend/src/service/learner.service.ts'

describe('LearnerService.getProgress', () => {
  it('n’affiche plus un exercice retiré du catalogue depuis la tentative', async () => {
    const progress = new InMemoryProgressRepository()
    const service = new LearnerService(
      new InMemoryUserRepository(),
      progress,
      new InMemoryTrackRepository(),
      new InMemoryExerciseRepository(),
    )
    const { id } = await service.createLearner()
    const [served] = EXERCISES
    await service.recordAttempt(id, served!.id, true)
    await progress.recordAttempt(id, 9_999, true, new Date())

    const result = await service.getProgress(id)

    expect(result?.passedCount).toBe(1)
    expect(result?.exercises.map((e) => e.exercise)).toEqual([served!.slug])
  })
})
