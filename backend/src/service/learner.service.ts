import type { PlacementLevel } from '../entity/placement.entity.ts'
import type { ExerciseRepository } from '../repository/exercise.repository.ts'
import type { PlacementRepository } from '../repository/placement.repository.ts'
import type { ProgressRepository } from '../repository/progress.repository.ts'
import type { TrackRepository } from '../repository/track.repository.ts'
import type { UserRepository } from '../repository/user.repository.ts'
import type { CertificateService, CertificateView } from './certificate.service.ts'
import type { TrackLink } from './track.service.ts'
import { toTrackLink } from './track.service.ts'

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

export interface PlacementView {
  readonly score: number
  readonly level: PlacementLevel
  readonly track: TrackLink | null
  readonly createdAt: Date
}

export interface LearnerProgress {
  /** Dernier questionnaire passe avec cet identifiant, null s'il n'en a passe aucun. */
  readonly placement: PlacementView | null
  readonly passedCount: number
  readonly exercises: readonly ExerciseProgressView[]
  readonly certificates: readonly CertificateView[]
}

export type LearnerAccess = 'allowed' | 'not-found' | 'unauthenticated' | 'forbidden'

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
  private readonly placements: PlacementRepository
  private readonly certificates: CertificateService

  constructor(
    users: UserRepository,
    progress: ProgressRepository,
    tracks: TrackRepository,
    exercises: ExerciseRepository,
    placements: PlacementRepository,
    certificates: CertificateService,
  ) {
    this.users = users
    this.progress = progress
    this.tracks = tracks
    this.exercises = exercises
    this.placements = placements
    this.certificates = certificates
  }

  async createLearner(): Promise<{ readonly id: string }> {
    const { id } = await this.users.createAnonymous()
    return { id }
  }

  async exists(learnerId: string): Promise<boolean> {
    return (await this.users.findById(learnerId)) !== null
  }

  /** Un anonyme reste accessible par son seul identifiant ; un compte inscrit, par sa session seulement. */
  async access(learnerId: string, sessionUserId: string | null): Promise<LearnerAccess> {
    const learner = await this.users.findById(learnerId)
    if (!learner) {
      return 'not-found'
    }
    if (learner.email === null || learner.id === sessionUserId) {
      return 'allowed'
    }
    return sessionUserId === null ? 'unauthenticated' : 'forbidden'
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
    return {
      placement: await this.latestPlacement(learnerId),
      passedCount: exercises.filter((e) => e.passed).length,
      exercises,
      certificates: await this.certificates.listForLearner(learnerId),
    }
  }

  private async latestPlacement(learnerId: string): Promise<PlacementView | null> {
    const placement = await this.placements.findLatestByUser(learnerId)
    if (!placement) {
      return null
    }
    const track = (await this.tracks.listTracks()).find((t) => t.id === placement.trackId)
    return {
      score: placement.score,
      level: placement.level,
      // Parcours depublie depuis le questionnaire : le niveau reste utile sans lui.
      track: track ? toTrackLink(track) : null,
      createdAt: placement.createdAt,
    }
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
