import type { ExerciseProgress } from '../entity/exercise-progress.entity.ts'

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
}

const key = (userId: string, exerciseId: number): string => `${userId}/${exerciseId}`

export class InMemoryProgressRepository implements ProgressRepository {
  private readonly progress = new Map<string, ExerciseProgress>()

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

  async listProgress(userId: string): Promise<readonly ExerciseProgress[]> {
    return [...this.progress.values()]
      .filter((p) => p.userId === userId)
      .toSorted((a, b) => a.exerciseId - b.exerciseId)
      .map((p) => ({ ...p }))
  }
}
