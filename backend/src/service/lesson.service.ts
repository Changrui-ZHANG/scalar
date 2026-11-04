import type { LessonRepository } from '../repository/lesson.repository.ts'
import type { TrackRepository } from '../repository/track.repository.ts'
import type { TrackLink } from './track.service.ts'
import { rank, toTrackLink } from './track.service.ts'

export interface LessonDetail {
  readonly slug: string
  readonly title: string
  readonly summary: string
  readonly body: string
  readonly lastReviewedAt: string | null
  readonly number: number
  readonly track: TrackLink
  readonly chapter: { readonly slug: string; readonly title: string; readonly number: number }
}

export class LessonService {
  private readonly tracks: TrackRepository
  private readonly lessons: LessonRepository

  constructor(tracks: TrackRepository, lessons: LessonRepository) {
    this.tracks = tracks
    this.lessons = lessons
  }

  async getLesson(
    trackSlug: string,
    chapterSlug: string,
    lessonSlug: string,
  ): Promise<LessonDetail | null> {
    const track = await this.tracks.findTrackBySlug(trackSlug)
    const chapter = track && (await this.tracks.findChapter(track.id, chapterSlug))
    const lesson = chapter && (await this.lessons.findLesson(chapter.id, lessonSlug))
    if (!track || !chapter || !lesson) {
      return null
    }
    const chapters = await this.tracks.listChapters(track.id)
    const siblings = await this.lessons.listLessons(chapter.id)
    return {
      slug: lesson.slug,
      title: lesson.title,
      summary: lesson.summary,
      body: lesson.body,
      lastReviewedAt: lesson.lastReviewedAt?.toISOString() ?? null,
      number: rank(siblings, lesson),
      track: toTrackLink(track),
      chapter: { slug: chapter.slug, title: chapter.title, number: rank(chapters, chapter) },
    }
  }
}
