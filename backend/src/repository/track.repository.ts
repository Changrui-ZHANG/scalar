import { CHAPTER_LEVELS } from '../constants.ts'
import type { Chapter } from '../entity/chapter.entity.ts'
import type { Track } from '../entity/track.entity.ts'
import { CHAPTERS } from '../content/chapters.ts'
import { TRACKS } from '../content/tracks.ts'

export interface TrackRepository {
  listTracks(): Promise<readonly Track[]>
  findTrackBySlug(slug: string): Promise<Track | null>
  listChapters(trackId: number): Promise<readonly Chapter[]>
  findChapter(trackId: number, slug: string): Promise<Chapter | null>
}

/** Ordre d'affichage des niveaux : celui de l'enum en base. */
const byPosition = (a: { position: number }, b: { position: number }): number =>
  a.position - b.position

const byLevelThenPosition = (a: Chapter, b: Chapter): number =>
  CHAPTER_LEVELS.indexOf(a.level) - CHAPTER_LEVELS.indexOf(b.level) || byPosition(a, b)

export class InMemoryTrackRepository implements TrackRepository {
  private readonly tracks: readonly Track[]
  private readonly chapters: readonly Chapter[]

  constructor(tracks: readonly Track[] = TRACKS, chapters: readonly Chapter[] = CHAPTERS) {
    this.tracks = tracks.filter((t) => t.status === 'published')
    this.chapters = chapters.filter((c) => c.status === 'published')
  }

  async listTracks(): Promise<readonly Track[]> {
    return this.tracks.toSorted(byPosition)
  }

  async findTrackBySlug(slug: string): Promise<Track | null> {
    return this.tracks.find((t) => t.slug === slug) ?? null
  }

  async listChapters(trackId: number): Promise<readonly Chapter[]> {
    return this.chapters.filter((c) => c.trackId === trackId).toSorted(byLevelThenPosition)
  }

  async findChapter(trackId: number, slug: string): Promise<Chapter | null> {
    return this.chapters.find((c) => c.trackId === trackId && c.slug === slug) ?? null
  }
}
