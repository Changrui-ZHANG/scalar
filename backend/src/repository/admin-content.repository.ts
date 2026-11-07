import type { ChapterLevel, ProgrammingLanguage, PublicationStatus } from '@scalar/shared/enums'

import { CHAPTER_LEVELS } from '../constants.ts'
import type { Chapter } from '../entity/chapter.entity.ts'
import type { Track } from '../entity/track.entity.ts'
import { CHAPTERS } from '../content/chapters.ts'
import { EXERCISES } from '../content/exercises.ts'
import { LESSONS } from '../content/lessons.ts'
import { TRACKS } from '../content/tracks.ts'

export interface TrackInput {
  readonly slug: string
  readonly name: string
  readonly summary: string
  readonly programmingLanguage: ProgrammingLanguage | null
  readonly prerequisiteTrackId: number | null
}

export interface TrackChanges extends Partial<TrackInput> {
  readonly status?: PublicationStatus
  readonly firstPublishedAt?: Date
}

export interface ChapterInput {
  readonly slug: string
  readonly level: ChapterLevel
  readonly title: string
  readonly summary: string
}

export interface ChapterChanges extends Partial<ChapterInput> {
  readonly status?: PublicationStatus
  readonly firstPublishedAt?: Date
}

export type SaveOutcome<T> =
  | { readonly status: 'saved'; readonly item: T }
  /** L'element, ou pour une creation de chapitre son parcours. */
  | { readonly status: 'not-found' }
  | { readonly status: 'slug-taken' }
  | { readonly status: 'prerequisite-not-found' }

/** `in-use` : du contenu, un certificat ou un positionnement en depend encore. */
export type DeleteOutcome = 'deleted' | 'not-found' | 'in-use'

/** Tout le contenu, brouillons compris : jamais monte hors de `/api/v1/admin`. */
export interface AdminContentRepository {
  listTracks(): Promise<readonly Track[]>
  findTrack(id: number): Promise<Track | null>
  /** Toujours en brouillon, place apres les parcours existants. */
  createTrack(input: TrackInput): Promise<SaveOutcome<Track>>
  updateTrack(id: number, changes: TrackChanges): Promise<SaveOutcome<Track>>
  deleteTrack(id: number): Promise<DeleteOutcome>
  listChapters(trackId: number): Promise<readonly Chapter[]>
  findChapter(trackId: number, id: number): Promise<Chapter | null>
  /** Toujours en brouillon, place a la fin de son niveau. */
  createChapter(trackId: number, input: ChapterInput): Promise<SaveOutcome<Chapter>>
  /** Un changement de niveau replace le chapitre a la fin de son nouveau niveau. */
  updateChapter(trackId: number, id: number, changes: ChapterChanges): Promise<SaveOutcome<Chapter>>
  deleteChapter(trackId: number, id: number): Promise<DeleteOutcome>
}

const byPosition = (a: { position: number }, b: { position: number }): number =>
  a.position - b.position

const byLevelThenPosition = (a: Chapter, b: Chapter): number =>
  CHAPTER_LEVELS.indexOf(a.level) - CHAPTER_LEVELS.indexOf(b.level) || byPosition(a, b)

const nextPosition = (rows: readonly { position: number }[]): number =>
  Math.max(0, ...rows.map((r) => r.position)) + 1

const nextId = (rows: readonly { id: number }[]): number =>
  Math.max(0, ...rows.map((r) => r.id)) + 1

/** Les lecons et exercices ne servent qu'a refuser la suppression d'un chapitre qui en a. */
export class InMemoryAdminContentRepository implements AdminContentRepository {
  private tracks: Track[]
  private chapters: Chapter[]
  private readonly usedChapterIds: ReadonlySet<number>

  constructor(
    tracks: readonly Track[] = TRACKS,
    chapters: readonly Chapter[] = CHAPTERS,
    contents: readonly { chapterId: number }[] = [...LESSONS, ...EXERCISES],
  ) {
    this.tracks = tracks.map((t) => ({ ...t }))
    this.chapters = chapters.map((c) => ({ ...c }))
    this.usedChapterIds = new Set(contents.map((c) => c.chapterId))
  }

  async listTracks(): Promise<readonly Track[]> {
    return this.tracks.toSorted(byPosition).map((t) => ({ ...t }))
  }

  async findTrack(id: number): Promise<Track | null> {
    const track = this.tracks.find((t) => t.id === id)
    return track ? { ...track } : null
  }

  async createTrack(input: TrackInput): Promise<SaveOutcome<Track>> {
    const refusal = this.checkTrack(null, input)
    if (refusal) {
      return refusal
    }
    const now = new Date()
    const track: Track = {
      ...input,
      id: nextId(this.tracks),
      position: nextPosition(this.tracks),
      status: 'draft',
      firstPublishedAt: null,
      createdAt: now,
      updatedAt: now,
    }
    this.tracks.push(track)
    return { status: 'saved', item: { ...track } }
  }

  async updateTrack(id: number, changes: TrackChanges): Promise<SaveOutcome<Track>> {
    const track = this.tracks.find((t) => t.id === id)
    if (!track) {
      return { status: 'not-found' }
    }
    const refusal = this.checkTrack(id, changes)
    if (refusal) {
      return refusal
    }
    Object.assign(track, changes, { updatedAt: new Date() })
    return { status: 'saved', item: { ...track } }
  }

  async deleteTrack(id: number): Promise<DeleteOutcome> {
    if (!this.tracks.some((t) => t.id === id)) {
      return 'not-found'
    }
    if (this.chapters.some((c) => c.trackId === id)) {
      return 'in-use'
    }
    this.tracks = this.tracks
      .filter((t) => t.id !== id)
      .map((t) => (t.prerequisiteTrackId === id ? { ...t, prerequisiteTrackId: null } : t))
    return 'deleted'
  }

  async listChapters(trackId: number): Promise<readonly Chapter[]> {
    return this.chapters
      .filter((c) => c.trackId === trackId)
      .toSorted(byLevelThenPosition)
      .map((c) => ({ ...c }))
  }

  async findChapter(trackId: number, id: number): Promise<Chapter | null> {
    const chapter = this.chapters.find((c) => c.trackId === trackId && c.id === id)
    return chapter ? { ...chapter } : null
  }

  async createChapter(trackId: number, input: ChapterInput): Promise<SaveOutcome<Chapter>> {
    if (!this.tracks.some((t) => t.id === trackId)) {
      return { status: 'not-found' }
    }
    if (this.slugTakenInTrack(trackId, null, input.slug)) {
      return { status: 'slug-taken' }
    }
    const now = new Date()
    const chapter: Chapter = {
      ...input,
      id: nextId(this.chapters),
      trackId,
      position: this.nextChapterPosition(trackId, input.level),
      status: 'draft',
      firstPublishedAt: null,
      createdAt: now,
      updatedAt: now,
    }
    this.chapters.push(chapter)
    return { status: 'saved', item: { ...chapter } }
  }

  async updateChapter(
    trackId: number,
    id: number,
    changes: ChapterChanges,
  ): Promise<SaveOutcome<Chapter>> {
    const chapter = this.chapters.find((c) => c.trackId === trackId && c.id === id)
    if (!chapter) {
      return { status: 'not-found' }
    }
    if (changes.slug !== undefined && this.slugTakenInTrack(trackId, id, changes.slug)) {
      return { status: 'slug-taken' }
    }
    const moved = changes.level !== undefined && changes.level !== chapter.level
    const position = moved ? this.nextChapterPosition(trackId, changes.level!) : chapter.position
    Object.assign(chapter, changes, { position, updatedAt: new Date() })
    return { status: 'saved', item: { ...chapter } }
  }

  async deleteChapter(trackId: number, id: number): Promise<DeleteOutcome> {
    if (!this.chapters.some((c) => c.trackId === trackId && c.id === id)) {
      return 'not-found'
    }
    if (this.usedChapterIds.has(id)) {
      return 'in-use'
    }
    this.chapters = this.chapters.filter((c) => c.id !== id)
    return 'deleted'
  }

  private checkTrack(
    id: number | null,
    { slug, prerequisiteTrackId }: Partial<TrackInput>,
  ): SaveOutcome<Track> | null {
    if (slug !== undefined && this.tracks.some((t) => t.slug === slug && t.id !== id)) {
      return { status: 'slug-taken' }
    }
    if (
      prerequisiteTrackId !== undefined &&
      prerequisiteTrackId !== null &&
      !this.tracks.some((t) => t.id === prerequisiteTrackId)
    ) {
      return { status: 'prerequisite-not-found' }
    }
    return null
  }

  private slugTakenInTrack(trackId: number, id: number | null, slug: string): boolean {
    return this.chapters.some((c) => c.trackId === trackId && c.slug === slug && c.id !== id)
  }

  private nextChapterPosition(trackId: number, level: ChapterLevel): number {
    return nextPosition(this.chapters.filter((c) => c.trackId === trackId && c.level === level))
  }
}
