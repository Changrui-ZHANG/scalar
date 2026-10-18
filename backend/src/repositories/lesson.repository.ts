import type { Lesson } from '../db/schema.ts'
import { MOCK_LESSONS } from './lesson.mock.ts'

/**
 * Acces aux lecons d'un chapitre. Seules les lecons publiees sont servies ;
 * un slug est unique dans son chapitre.
 */
export interface LessonRepository {
  /** Lecons publiees d'un chapitre, triees par position. */
  listLessons(chapterId: number): Promise<readonly Lesson[]>
  findLesson(chapterId: number, slug: string): Promise<Lesson | null>
}

const byPosition = (a: { position: number }, b: { position: number }): number =>
  a.position - b.position

// Donnees fictives en memoire ; PrismaLessonRepository pour la base.
export class InMemoryLessonRepository implements LessonRepository {
  private readonly lessons: readonly Lesson[]

  constructor(lessons: readonly Lesson[] = MOCK_LESSONS) {
    this.lessons = lessons.filter((l) => l.status === 'published')
  }

  async listLessons(chapterId: number): Promise<readonly Lesson[]> {
    return this.lessons.filter((l) => l.chapterId === chapterId).toSorted(byPosition)
  }

  async findLesson(chapterId: number, slug: string): Promise<Lesson | null> {
    return this.lessons.find((l) => l.chapterId === chapterId && l.slug === slug) ?? null
  }
}
