import type { ExerciseRepository } from '../repository/exercise.repository.ts'
import type { ProgressRepository } from '../repository/progress.repository.ts'
import type { TrackRepository } from '../repository/track.repository.ts'
import type { UserRepository } from '../repository/user.repository.ts'

export interface ExerciseProgressView {
  readonly track: string
  readonly chapter: string
  readonly exercise: string
  readonly title: string
  readonly attempts: number
  readonly passed: boolean
  readonly firstPassedAt: Date | null
  readonly lastAttemptAt: Date
}

export interface LearnerProgress {
  readonly passedCount: number
  readonly exercises: readonly ExerciseProgressView[]
}

interface ExerciseLink {
  readonly track: string
  readonly chapter: string
  readonly exercise: string
  readonly title: string
}

export class LearnerService {
  private readonly users: UserRepository
  private readonly progress: ProgressRepository
  private readonly tracks: TrackRepository
  private readonly exercises: ExerciseRepository

  constructor(
    users: UserRepository,
    progress: ProgressRepository,
    tracks: TrackRepository,
    exercises: ExerciseRepository,
  ) {
    this.users = users
    this.progress = progress
    this.tracks = tracks
    this.exercises = exercises
  }

  async createLearner(): Promise<{ readonly id: string }> {
    const { id } = await this.users.createAnonymous()
    return { id }
  }

  async exists(learnerId: string): Promise<boolean> {
    return (await this.users.findById(learnerId)) !== null
  }

  async recordAttempt(learnerId: string, exerciseId: number, passed: boolean): Promise<void> {
    await this.progress.recordAttempt(learnerId, exerciseId, passed, new Date())
  }

  async getProgress(learnerId: string): Promise<LearnerProgress | null> {
    if (!(await this.exists(learnerId))) {
      return null
    }
    const links = await this.linkExercises()
    const exercises = (await this.progress.listProgress(learnerId)).flatMap((p) => {
      const link = links.get(p.exerciseId)
      // Exercice retire du catalogue depuis la tentative : plus rien a afficher.
      return link
        ? [
            {
              ...link,
              attempts: p.attempts,
              passed: p.firstPassedAt !== null,
              firstPassedAt: p.firstPassedAt,
              lastAttemptAt: p.lastAttemptAt,
            },
          ]
        : []
    })
    return { passedCount: exercises.filter((e) => e.passed).length, exercises }
  }

  private async linkExercises(): Promise<ReadonlyMap<number, ExerciseLink>> {
    const links = new Map<number, ExerciseLink>()
    for (const track of await this.tracks.listTracks()) {
      for (const chapter of await this.tracks.listChapters(track.id)) {
        for (const exercise of await this.exercises.listExercises(chapter.id)) {
          links.set(exercise.id, {
            track: track.slug,
            chapter: chapter.slug,
            exercise: exercise.slug,
            title: exercise.title,
          })
        }
      }
    }
    return links
  }
}
