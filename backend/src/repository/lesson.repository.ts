import type { Lesson } from '../database/types.ts'
import { LESSONS } from '../content/lessons.ts'

export interface LessonRepository {
  listLessons(chapterId: number): Promise<readonly Lesson[]>
  findLesson(chapterId: number, slug: string): Promise<Lesson | null>
}

const byPosition = (a: { position: number }, b: { position: number }): number =>
  a.position - b.position

export class InMemoryLessonRepository implements LessonRepository {
  private readonly lessons: readonly Lesson[]

  constructor(lessons: readonly Lesson[] = LESSONS) {
    this.lessons = lessons.filter((l) => l.status === 'published')
  }

  async listLessons(chapterId: number): Promise<readonly Lesson[]> {
    return this.lessons.filter((l) => l.chapterId === chapterId).toSorted(byPosition)
  }

  async findLesson(chapterId: number, slug: string): Promise<Lesson | null> {
    return this.lessons.find((l) => l.chapterId === chapterId && l.slug === slug) ?? null
  }
}
