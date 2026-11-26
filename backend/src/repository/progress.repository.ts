import type { ExerciseProgress } from '../entity/exercise-progress.entity.ts'
import type { LessonProgress } from '../entity/lesson-progress.entity.ts'

export interface ProgressRepository {
  /** Compte une soumission ; une premiere reussite est datee de `at` et le reste. */
  recordAttempt(
    userId: string,
    exerciseId: number,
    passed: boolean,
    at: Date,
  ): Promise<ExerciseProgress>
  findProgress(userId: string, exerciseId: number): Promise<ExerciseProgress | null>
  /** Par exercice croissant. */
  listProgress(userId: string): Promise<readonly ExerciseProgress[]>
  /** Couples apprenant / exercice : tentes au moins une fois, et reussis. */
  countAttempts(): Promise<{ readonly attempted: number; readonly passed: number }>
  /** Marque une lecon terminee ; une lecon deja terminee garde sa premiere date. */
  recordLessonCompletion(userId: string, lessonId: number, at: Date): Promise<LessonProgress>
  /** Par lecon croissante. */
  listLessonCompletions(userId: string): Promise<readonly LessonProgress[]>
  /**
   * Ajoute la progression de `fromUserId` a celle de `intoUserId` (connexion d'un
   * apprenant anonyme) : tentatives additionnees, premieres reussites et fins de
   * lecture gardees a la date la plus ancienne. Les lignes de `fromUserId` restent.
   */
  mergeProgress(fromUserId: string, intoUserId: string): Promise<void>
}

const key = (userId: string, id: number): string => `${userId}/${id}`

/** La plus ancienne des deux dates ; une date nulle ne compte pas. */
export function earliest(a: Date | null, b: Date | null): Date | null {
  if (a === null) return b
  if (b === null) return a
  return a <= b ? a : b
}

/** Fusion de deux lignes de progression sur le meme exercice. */
export function mergeExerciseProgress(
  into: ExerciseProgress,
  from: ExerciseProgress,
): ExerciseProgress {
  return {
    userId: into.userId,
    exerciseId: into.exerciseId,
    attempts: into.attempts + from.attempts,
    firstPassedAt: earliest(into.firstPassedAt, from.firstPassedAt),
    lastAttemptAt: into.lastAttemptAt >= from.lastAttemptAt ? into.lastAttemptAt : from.lastAttemptAt,
  }
}

export class InMemoryProgressRepository implements ProgressRepository {
  private readonly progress = new Map<string, ExerciseProgress>()
  private readonly lessons = new Map<string, LessonProgress>()

  async recordAttempt(
    userId: string,
    exerciseId: number,
    passed: boolean,
    at: Date,
  ): Promise<ExerciseProgress> {
    const previous = this.progress.get(key(userId, exerciseId))
    const next: ExerciseProgress = {
      userId,
      exerciseId,
      attempts: (previous?.attempts ?? 0) + 1,
      firstPassedAt: previous?.firstPassedAt ?? (passed ? at : null),
      lastAttemptAt: at,
    }
    this.progress.set(key(userId, exerciseId), next)
    return { ...next }
  }

  async findProgress(userId: string, exerciseId: number): Promise<ExerciseProgress | null> {
    const found = this.progress.get(key(userId, exerciseId))
    return found ? { ...found } : null
  }

  async countAttempts(): Promise<{ readonly attempted: number; readonly passed: number }> {
    const rows = [...this.progress.values()]
    return { attempted: rows.length, passed: rows.filter((p) => p.firstPassedAt !== null).length }
  }

  async listProgress(userId: string): Promise<readonly ExerciseProgress[]> {
    return [...this.progress.values()]
      .filter((p) => p.userId === userId)
      .toSorted((a, b) => a.exerciseId - b.exerciseId)
      .map((p) => ({ ...p }))
  }

  async recordLessonCompletion(
    userId: string,
    lessonId: number,
    at: Date,
  ): Promise<LessonProgress> {
    const previous = this.lessons.get(key(userId, lessonId))
    const row: LessonProgress = previous ?? { userId, lessonId, completedAt: at }
    this.lessons.set(key(userId, lessonId), row)
    return { ...row }
  }

  async listLessonCompletions(userId: string): Promise<readonly LessonProgress[]> {
    return [...this.lessons.values()]
      .filter((l) => l.userId === userId)
      .toSorted((a, b) => a.lessonId - b.lessonId)
      .map((l) => ({ ...l }))
  }

  async mergeProgress(fromUserId: string, intoUserId: string): Promise<void> {
    for (const from of await this.listProgress(fromUserId)) {
      const into = this.progress.get(key(intoUserId, from.exerciseId))
      const merged = into
        ? mergeExerciseProgress(into, from)
        : { ...from, userId: intoUserId }
      this.progress.set(key(intoUserId, from.exerciseId), merged)
    }
    for (const from of await this.listLessonCompletions(fromUserId)) {
      const into = this.lessons.get(key(intoUserId, from.lessonId))
      const completedAt = earliest(into?.completedAt ?? null, from.completedAt) ?? from.completedAt
      this.lessons.set(key(intoUserId, from.lessonId), {
        userId: intoUserId,
        lessonId: from.lessonId,
        completedAt,
      })
    }
  }
}
