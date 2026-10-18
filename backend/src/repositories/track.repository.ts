import type { Chapter, ChapterLevel, Track } from '../db/schema.ts'
import { MOCK_CHAPTERS } from './chapter.mock.ts'
import { MOCK_TRACKS } from './track.mock.ts'

/**
 * Acces aux parcours et a leurs chapitres. Seul le contenu publie est servi ;
 * le slug d'un chapitre n'est unique que dans son parcours.
 */
export interface TrackRepository {
  /** Parcours publies, tries par position. */
  listTracks(): Promise<readonly Track[]>
  findTrackBySlug(slug: string): Promise<Track | null>
  /** Chapitres publies d'un parcours, tries par niveau puis par position. */
  listChapters(trackId: number): Promise<readonly Chapter[]>
  findChapter(trackId: number, slug: string): Promise<Chapter | null>
}

/** Ordre d'affichage des niveaux : celui de l'enum en base. */
export const CHAPTER_LEVELS: readonly ChapterLevel[] = [
  'beginner',
  'intermediate',
  'advanced',
  'ecosystem',
]

const byPosition = (a: { position: number }, b: { position: number }): number =>
  a.position - b.position

const byLevelThenPosition = (a: Chapter, b: Chapter): number =>
  CHAPTER_LEVELS.indexOf(a.level) - CHAPTER_LEVELS.indexOf(b.level) || byPosition(a, b)

// Donnees fictives en memoire ; PrismaTrackRepository pour la base.
export class InMemoryTrackRepository implements TrackRepository {
  private readonly tracks: readonly Track[]
  private readonly chapters: readonly Chapter[]

  constructor(
    tracks: readonly Track[] = MOCK_TRACKS,
    chapters: readonly Chapter[] = MOCK_CHAPTERS,
  ) {
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
