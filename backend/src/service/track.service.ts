// Toute recherche part du parcours : un element n'est servi que si ses parents sont publies.

import type { Chapter, ChapterLevel, ProgrammingLanguage, Track } from '../database/types.ts'
import type { ExerciseRepository } from '../repository/exercise.repository.ts'
import type { LessonRepository } from '../repository/lesson.repository.ts'
import type { TrackRepository } from '../repository/track.repository.ts'

export interface TrackLink {
  readonly slug: string
  readonly name: string
}

export interface TrackSummary extends TrackLink {
  readonly summary: string
  readonly programmingLanguage: ProgrammingLanguage | null
  readonly prerequisite: TrackLink | null
}

export interface TrackChapter {
  readonly slug: string
  readonly title: string
  readonly level: ChapterLevel
  /** Rang continu dans le parcours, a partir de 1 : jamais la valeur de `position`. */
  readonly number: number
  readonly lessons: readonly {
    readonly slug: string
    readonly title: string
    readonly summary: string
  }[]
  readonly exercises: readonly {
    readonly slug: string
    readonly title: string
    readonly instructions: string
  }[]
}

export interface TrackView {
  readonly track: TrackLink & { readonly programmingLanguage: ProgrammingLanguage | null }
  readonly chapters: readonly TrackChapter[]
}

export const toTrackLink = (track: Track): TrackLink => ({ slug: track.slug, name: track.name })

export const rank = <T extends { id: number }>(items: readonly T[], item: T): number =>
  items.findIndex((i) => i.id === item.id) + 1

export class TrackService {
  private readonly tracks: TrackRepository
  private readonly lessons: LessonRepository
  private readonly exercises: ExerciseRepository

  constructor(tracks: TrackRepository, lessons: LessonRepository, exercises: ExerciseRepository) {
    this.tracks = tracks
    this.lessons = lessons
    this.exercises = exercises
  }

  async listTracks(): Promise<readonly TrackSummary[]> {
    const tracks = await this.tracks.listTracks()
    return tracks.map((t) => {
      const prerequisite = tracks.find((p) => p.id === t.prerequisiteTrackId)
      return {
        ...toTrackLink(t),
        summary: t.summary,
        programmingLanguage: t.programmingLanguage,
        prerequisite: prerequisite ? toTrackLink(prerequisite) : null,
      }
    })
  }

  async getTrack(trackSlug: string): Promise<TrackView | null> {
    const track = await this.tracks.findTrackBySlug(trackSlug)
    if (!track) {
      return null
    }
    const chapters = await this.tracks.listChapters(track.id)
    return {
      track: { ...toTrackLink(track), programmingLanguage: track.programmingLanguage },
      chapters: await Promise.all(chapters.map((c, i) => this.toTrackChapter(track, c, i + 1))),
    }
  }

  private async toTrackChapter(
    track: Track,
    chapter: Chapter,
    number: number,
  ): Promise<TrackChapter> {
    const lessons = await this.lessons.listLessons(chapter.id)
    const exercises =
      track.programmingLanguage === null ? [] : await this.exercises.listExercises(chapter.id)
    return {
      slug: chapter.slug,
      title: chapter.title,
      level: chapter.level,
      number,
      lessons: lessons.map((l) => ({ slug: l.slug, title: l.title, summary: l.summary })),
      exercises: exercises.map((e) => ({
        slug: e.slug,
        title: e.title,
        instructions: e.instructions,
      })),
    }
  }
}
