import type { Chapter, Exercise, ExerciseTestCase } from '../db/schema.ts'
import { MOCK_CHAPTERS, MOCK_EXERCISES, MOCK_EXERCISE_TEST_CASES } from './exercise.mock.ts'

/**
 * Acces aux parcours : chapitres, exercices et leurs cas de test.
 * Seul le contenu publie est servi ; les slugs sont uniques dans leur parent.
 */
export interface ExerciseRepository {
  /** Chapitres publies d'un langage, tries par position. */
  listChapters(languageId: number): Promise<readonly Chapter[]>
  findChapter(languageId: number, slug: string): Promise<Chapter | null>
  findChapterById(id: number): Promise<Chapter | null>
  /** Exercices publies d'un chapitre, tries par position. */
  listExercises(chapterId: number): Promise<readonly Exercise[]>
  findExercise(chapterId: number, slug: string): Promise<Exercise | null>
  /** Cas de test d'un exercice, tries par position. */
  listTestCases(exerciseId: number): Promise<readonly ExerciseTestCase[]>
}

const byPosition = (a: { position: number }, b: { position: number }): number =>
  a.position - b.position

// Donnees fictives en memoire ; PrismaExerciseRepository pour la base.
export class InMemoryExerciseRepository implements ExerciseRepository {
  private readonly chapters: readonly Chapter[]
  private readonly exercises: readonly Exercise[]
  private readonly testCases: readonly ExerciseTestCase[]

  constructor(
    chapters: readonly Chapter[] = MOCK_CHAPTERS,
    exercises: readonly Exercise[] = MOCK_EXERCISES,
    testCases: readonly ExerciseTestCase[] = MOCK_EXERCISE_TEST_CASES,
  ) {
    this.chapters = chapters.filter((c) => c.status === 'published')
    this.exercises = exercises.filter((e) => e.status === 'published')
    this.testCases = testCases
  }

  async listChapters(languageId: number): Promise<readonly Chapter[]> {
    return this.chapters.filter((c) => c.languageId === languageId).toSorted(byPosition)
  }

  async findChapter(languageId: number, slug: string): Promise<Chapter | null> {
    return this.chapters.find((c) => c.languageId === languageId && c.slug === slug) ?? null
  }

  async findChapterById(id: number): Promise<Chapter | null> {
    return this.chapters.find((c) => c.id === id) ?? null
  }

  async listExercises(chapterId: number): Promise<readonly Exercise[]> {
    return this.exercises.filter((e) => e.chapterId === chapterId).toSorted(byPosition)
  }

  async findExercise(chapterId: number, slug: string): Promise<Exercise | null> {
    return this.exercises.find((e) => e.chapterId === chapterId && e.slug === slug) ?? null
  }

  async listTestCases(exerciseId: number): Promise<readonly ExerciseTestCase[]> {
    return this.testCases.filter((t) => t.exerciseId === exerciseId).toSorted(byPosition)
  }
}
