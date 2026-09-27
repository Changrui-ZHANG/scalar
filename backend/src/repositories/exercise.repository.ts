import type { Chapter, Exercise, Language } from '../db/schema.ts'
import { MOCK_CHAPTERS, MOCK_EXERCISES } from './exercise.mock.ts'

/**
 * Acces aux chapitres et exercices. Le service ne depend que de ce contrat :
 * l'implementation en memoire sera remplacee par Prisma sans le toucher.
 */
export interface ExerciseRepository {
  /** Chapitres d'un langage, tries par position. */
  listChapters(language: Language): Promise<readonly Chapter[]>
  /** Exercices d'un chapitre, tries par position. */
  listExercises(chapterId: number): Promise<readonly Exercise[]>
  findChapterBySlug(slug: string): Promise<Chapter | null>
  findExerciseBySlug(slug: string): Promise<Exercise | null>
}

const byPosition = (a: { position: number }, b: { position: number }): number =>
  a.position - b.position

// ponytail: donnees fictives en memoire tant que la base n'est pas alimentee ;
// a remplacer par un PrismaExerciseRepository.
export class InMemoryExerciseRepository implements ExerciseRepository {
  private readonly chapters: readonly Chapter[]
  private readonly exercises: readonly Exercise[]

  constructor(
    chapters: readonly Chapter[] = MOCK_CHAPTERS,
    exercises: readonly Exercise[] = MOCK_EXERCISES,
  ) {
    this.chapters = chapters
    this.exercises = exercises
  }

  async listChapters(language: Language): Promise<readonly Chapter[]> {
    return this.chapters.filter((c) => c.language === language).toSorted(byPosition)
  }

  async listExercises(chapterId: number): Promise<readonly Exercise[]> {
    return this.exercises.filter((e) => e.chapterId === chapterId).toSorted(byPosition)
  }

  async findChapterBySlug(slug: string): Promise<Chapter | null> {
    return this.chapters.find((c) => c.slug === slug) ?? null
  }

  async findExerciseBySlug(slug: string): Promise<Exercise | null> {
    return this.exercises.find((e) => e.slug === slug) ?? null
  }
}
