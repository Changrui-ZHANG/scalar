import type { Lesson, LessonCategory, LessonChapter } from '../db/schema.ts'
import { MOCK_LESSON_CATEGORIES, MOCK_LESSON_CHAPTERS, MOCK_LESSONS } from './lesson.mock.ts'

/**
 * Acces a la section Connaissance : categories, lecons et liens vers les
 * chapitres. Seules les lecons publiees sont servies.
 */
export interface LessonRepository {
  /** Categories, triees par position. */
  listCategories(): Promise<readonly LessonCategory[]>
  findCategoryBySlug(slug: string): Promise<LessonCategory | null>
  /** Lecons d'un langage, ou lecons « tous langages » pour `null`, triees par position. */
  listLessons(languageId: number | null): Promise<readonly Lesson[]>
  findLesson(languageId: number | null, slug: string): Promise<Lesson | null>
  /** Ids des chapitres lies a une lecon. */
  listChapterIds(lessonId: number): Promise<readonly number[]>
  /** Lecons publiees liees a un chapitre. */
  listLessonsForChapter(chapterId: number): Promise<readonly Lesson[]>
}

const byPosition = (a: { position: number }, b: { position: number }): number =>
  a.position - b.position

// ponytail: donnees fictives en memoire ; PrismaLessonRepository pour la base.
export class InMemoryLessonRepository implements LessonRepository {
  private readonly categories: readonly LessonCategory[]
  private readonly lessons: readonly Lesson[]
  private readonly links: readonly LessonChapter[]

  constructor(
    categories: readonly LessonCategory[] = MOCK_LESSON_CATEGORIES,
    lessons: readonly Lesson[] = MOCK_LESSONS,
    links: readonly LessonChapter[] = MOCK_LESSON_CHAPTERS,
  ) {
    this.categories = categories
    this.lessons = lessons.filter((l) => l.status === 'published')
    this.links = links
  }

  async listCategories(): Promise<readonly LessonCategory[]> {
    return this.categories.toSorted(byPosition)
  }

  async findCategoryBySlug(slug: string): Promise<LessonCategory | null> {
    return this.categories.find((c) => c.slug === slug) ?? null
  }

  async listLessons(languageId: number | null): Promise<readonly Lesson[]> {
    return this.lessons.filter((l) => l.languageId === languageId).toSorted(byPosition)
  }

  async findLesson(languageId: number | null, slug: string): Promise<Lesson | null> {
    return this.lessons.find((l) => l.languageId === languageId && l.slug === slug) ?? null
  }

  async listChapterIds(lessonId: number): Promise<readonly number[]> {
    return this.links.filter((l) => l.lessonId === lessonId).map((l) => l.chapterId)
  }

  async listLessonsForChapter(chapterId: number): Promise<readonly Lesson[]> {
    const ids = new Set(this.links.filter((l) => l.chapterId === chapterId).map((l) => l.lessonId))
    return this.lessons.filter((l) => ids.has(l.id)).toSorted(byPosition)
  }
}
