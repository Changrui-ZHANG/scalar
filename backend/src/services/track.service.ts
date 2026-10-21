/**
 * Lecture des parcours : la page Parcours, et le fil d'un parcours.
 *
 * Un element n'est servi que si lui et ses parents sont publies : les depots
 * ne renvoient que du contenu publie, et chaque recherche part du parcours.
 */

import { parseMarkdown, type MarkdownBlock } from '@scalar/shared/markdown'
import type { LessonHeading } from '@scalar/shared/api'
import type { Chapter, ChapterLevel, ProgrammingLanguage, Track } from '../db/schema.ts'
import type { ExerciseRepository } from '../repositories/exercise.repository.ts'
import type { LessonRepository } from '../repositories/lesson.repository.ts'
import type { TrackRepository } from '../repositories/track.repository.ts'

export interface TrackLink {
  readonly slug: string
  readonly name: string
}

export interface TrackSummary extends TrackLink {
  readonly summary: string
  /** Nul pour un parcours de lecons seulement. */
  readonly programmingLanguage: ProgrammingLanguage | null
  /** Parcours a suivre avant celui-ci, s'il y en a un. */
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
    readonly headings: readonly LessonHeading[]
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

/** Rang d'un element dans une liste deja triee, a partir de 1 ; 0 s'il n'y est pas. */
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
      // Un prerequis non publie n'est pas cite.
      const prerequisite = tracks.find((p) => p.id === t.prerequisiteTrackId)
      return {
        ...toTrackLink(t),
        summary: t.summary,
        programmingLanguage: t.programmingLanguage,
        prerequisite: prerequisite ? toTrackLink(prerequisite) : null,
      }
    })
  }

  /**
   * Fil d'un parcours : chaque chapitre avec ses lecons puis ses exercices,
   * dans l'ordre. De quoi numeroter les episodes et chercher dedans en un appel.
   */
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

  private extractHeadings(body: string): readonly LessonHeading[] {
    const blocks = parseMarkdown(body, null)
    return blocks
      .filter((b): b is Extract<MarkdownBlock, { type: 'heading' }> => b.type === 'heading')
      .map((b) => ({ id: b.id, text: b.text }))
  }

  private async toTrackChapter(
    track: Track,
    chapter: Chapter,
    number: number,
  ): Promise<TrackChapter> {
    const lessons = await this.lessons.listLessons(chapter.id)
    // Un parcours sans langage n'a pas d'exercice : rien a executer.
    const exercises =
      track.programmingLanguage === null ? [] : await this.exercises.listExercises(chapter.id)
    return {
      slug: chapter.slug,
      title: chapter.title,
      level: chapter.level,
      number,
      lessons: lessons.map((l) => ({
        slug: l.slug,
        title: l.title,
        summary: l.summary,
        headings: this.extractHeadings(l.body),
      })),
      exercises: exercises.map((e) => ({
        slug: e.slug,
        title: e.title,
        instructions: e.instructions,
      })),
    }
  }
}
