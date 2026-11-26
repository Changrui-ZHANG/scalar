import type { Placement, PlacementLevel } from '../entity/placement.entity.ts'
import type { ExerciseRepository } from '../repository/exercise.repository.ts'
import type { LessonRepository } from '../repository/lesson.repository.ts'
import type { PlacementRepository } from '../repository/placement.repository.ts'
import type { ProgressRepository } from '../repository/progress.repository.ts'
import type { TrackRepository } from '../repository/track.repository.ts'
import type { UserRepository } from '../repository/user.repository.ts'
import type { CertificateService, CertificateView } from './certificate.service.ts'
import type { Badge, LearningPath, LearningPathService } from './learning-path.service.ts'
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

export interface LessonProgressView {
  readonly track: string
  readonly chapter: string
  readonly lesson: string
  readonly title: string
  readonly completedAt: Date
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
  /** Lecons terminees, dans l'ordre des identifiants. */
  readonly lessons: readonly LessonProgressView[]
  readonly certificates: readonly CertificateView[]
  /** Parcours conseille : celui du positionnement, sinon celui de la derniere tentative. */
  readonly path: LearningPath | null
  readonly badges: readonly Badge[]
}

export type LearnerAccess = 'allowed' | 'not-found' | 'unauthenticated' | 'forbidden'

interface ExerciseLink {
  readonly track: string
  readonly chapter: string
  readonly exercise: string
  readonly title: string
}

interface LessonLink {
  readonly track: string
  readonly chapter: string
  readonly lesson: string
  readonly title: string
}

export class LearnerService {
  private readonly users: UserRepository
  private readonly progress: ProgressRepository
  private readonly tracks: TrackRepository
  private readonly exercises: ExerciseRepository
  private readonly lessons: LessonRepository
  private readonly placements: PlacementRepository
  private readonly certificates: CertificateService
  private readonly learningPath: LearningPathService

  constructor(
    users: UserRepository,
    progress: ProgressRepository,
    tracks: TrackRepository,
    exercises: ExerciseRepository,
    lessons: LessonRepository,
    placements: PlacementRepository,
    certificates: CertificateService,
    learningPath: LearningPathService,
  ) {
    this.users = users
    this.progress = progress
    this.tracks = tracks
    this.exercises = exercises
    this.lessons = lessons
    this.placements = placements
    this.certificates = certificates
    this.learningPath = learningPath
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

  /** Null si la lecon n'est pas en ligne. Une lecon deja terminee garde sa premiere date. */
  async completeLesson(
    learnerId: string,
    trackSlug: string,
    chapterSlug: string,
    lessonSlug: string,
  ): Promise<{ readonly completedAt: Date } | null> {
    const track = await this.tracks.findTrackBySlug(trackSlug)
    const chapter = track && (await this.tracks.findChapter(track.id, chapterSlug))
    const lesson = chapter && (await this.lessons.findLesson(chapter.id, lessonSlug))
    if (!lesson) {
      return null
    }
    const row = await this.progress.recordLessonCompletion(learnerId, lesson.id, new Date())
    return { completedAt: row.completedAt }
  }

  /**
   * Connexion depuis un navigateur ou l'apprenant avait commence sans compte :
   * sa progression et ses positionnements passent au compte, puis l'anonyme est supprime.
   * Sans effet si `anonymousId` est inconnu, deja inscrit, ou le compte lui-meme.
   */
  async mergeAnonymous(anonymousId: string, userId: string): Promise<void> {
    if (anonymousId === userId) {
      return
    }
    const anonymous = await this.users.findById(anonymousId)
    if (!anonymous || anonymous.email !== null) {
      return
    }
    await this.progress.mergeProgress(anonymousId, userId)
    await this.placements.reassignUser(anonymousId, userId)
    await this.users.deleteAnonymous(anonymousId)
  }

  async getProgress(learnerId: string): Promise<LearnerProgress | null> {
    if (!(await this.exists(learnerId))) {
      return null
    }
    const links = await this.linkExercises()
    const rows = await this.progress.listProgress(learnerId)
    const placement = await this.placements.findLatestByUser(learnerId)
    const exercises = rows.flatMap((p) => {
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
    const lessonLinks = await this.linkLessons()
    const lessons = (await this.progress.listLessonCompletions(learnerId)).flatMap((row) => {
      const link = lessonLinks.get(row.lessonId)
      // Lecon retiree du site depuis : plus rien a afficher.
      return link ? [{ ...link, completedAt: row.completedAt }] : []
    })
    return {
      placement: await this.toPlacementView(placement),
      passedCount: exercises.filter((e) => e.passed).length,
      exercises,
      lessons,
      certificates: await this.certificates.listForLearner(learnerId),
      ...(await this.learningPath.describe(placement, rows)),
    }
  }

  private async toPlacementView(placement: Placement | null): Promise<PlacementView | null> {
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

  private async linkLessons(): Promise<ReadonlyMap<number, LessonLink>> {
    const links = new Map<number, LessonLink>()
    for (const track of await this.tracks.listTracks()) {
      for (const chapter of await this.tracks.listChapters(track.id)) {
        for (const lesson of await this.lessons.listLessons(chapter.id)) {
          links.set(lesson.id, {
            track: track.slug,
            chapter: chapter.slug,
            lesson: lesson.slug,
            title: lesson.title,
          })
        }
      }
    }
    return links
  }
}
