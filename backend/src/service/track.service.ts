// Toute recherche part du parcours : un element n'est servi que si ses parents sont publies.

import type { ChapterLevel, ProgrammingLanguage } from '@scalar/shared/enums'
import { parseMarkdown } from '@scalar/shared/markdown'
import type { Chapter } from '../entity/chapter.entity.ts'
import type { Track } from '../entity/track.entity.ts'
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

/** Intertitre `##` d'une lecon : `id` est l'ancre de la page de la lecon. */
export interface TrackLessonHeading {
  readonly id: string
  readonly text: string
}

export interface TrackChapter {
  readonly slug: string
  readonly title: string
  readonly summary: string
  readonly level: ChapterLevel
  /** Rang continu dans le parcours, a partir de 1 : jamais la valeur de `position`. */
  readonly number: number
  readonly lessons: readonly {
    readonly slug: string
    readonly title: string
    readonly summary: string
    readonly headings: readonly TrackLessonHeading[]
  }[]
  readonly exercises: readonly {
    readonly slug: string
    readonly title: string
    readonly instructions: string
  }[]
}

export interface TrackView {
  readonly track: TrackSummary
  readonly chapters: readonly TrackChapter[]
}

export const toTrackLink = (track: Track): TrackLink => ({ slug: track.slug, name: track.name })

/** Resume d'un parcours ; `allTracks` sert a retrouver son prerequis publie. */
function toTrackSummary(track: Track, allTracks: readonly Track[]): TrackSummary {
  let prerequisite: TrackLink | null = null
  for (const other of allTracks) {
    if (other.id === track.prerequisiteTrackId) {
      prerequisite = toTrackLink(other)
    }
  }
  return {
    ...toTrackLink(track),
    summary: track.summary,
    programmingLanguage: track.programmingLanguage,
    prerequisite,
  }
}

/** Intertitres `##` du cours, avec la meme ancre que sur la page de la lecon (parseMarkdown). */
function listHeadings(body: string): TrackLessonHeading[] {
  const headings: TrackLessonHeading[] = []
  for (const block of parseMarkdown(body)) {
    if (block.type === 'heading') {
      headings.push({ id: block.id, text: block.text })
    }
  }
  return headings
}

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
    return tracks.map((t) => toTrackSummary(t, tracks))
  }

  async getTrack(trackSlug: string): Promise<TrackView | null> {
    const track = await this.tracks.findTrackBySlug(trackSlug)
    if (!track) {
      return null
    }
    const chapters = await this.tracks.listChapters(track.id)
    // Le prerequis n'est cite que s'il est lui-meme publie : listTracks ne renvoie que ceux-la.
    const publishedTracks = await this.tracks.listTracks()
    return {
      track: toTrackSummary(track, publishedTracks),
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
      summary: chapter.summary,
      level: chapter.level,
      number,
      lessons: lessons.map((l) => ({
        slug: l.slug,
        title: l.title,
        summary: l.summary,
        headings: listHeadings(l.body),
      })),
      exercises: exercises.map((e) => ({
        slug: e.slug,
        title: e.title,
        instructions: e.instructions,
      })),
    }
  }
}
