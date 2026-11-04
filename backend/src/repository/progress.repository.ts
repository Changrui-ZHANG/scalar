import type { Exercise } from '../entity/exercise.entity.ts'
import type { ExerciseProgress } from '../entity/exercise-progress.entity.ts'
import { EXERCISES } from '../content/exercises.ts'
import { UnknownReferenceError } from './unknown-reference.error.ts'
import type { UserRepository } from './user.repository.ts'

export interface ProgressRepository {
  /** Compte une soumission ; une premiere reussite est datee de `at` et le reste. Leve UnknownReferenceError si l'apprenant ou l'exercice n'existe pas. */
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
  private readonly users: UserRepository
  // Tous statuts confondus, comme la cle etrangere : un brouillon existe aussi en base.
  private readonly exerciseIds: ReadonlySet<number>

  constructor(users: UserRepository, exercises: readonly Exercise[] = EXERCISES) {
    this.users = users
    this.exerciseIds = new Set(exercises.map((e) => e.id))
  }

  async recordAttempt(
    userId: string,
    exerciseId: number,
    passed: boolean,
    at: Date,
  ): Promise<ExerciseProgress> {
    if ((await this.users.findById(userId)) === null || !this.exerciseIds.has(exerciseId)) {
      throw new UnknownReferenceError(
        `Apprenant ou exercice introuvable : ${userId}, ${exerciseId}`,
      )
    }
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
