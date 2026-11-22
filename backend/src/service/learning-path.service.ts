import type { ChapterLevel } from '@scalar/shared/enums'

import { CHAPTER_LEVELS } from '../constants.ts'
import type { Chapter } from '../entity/chapter.entity.ts'
import type { Exercise } from '../entity/exercise.entity.ts'
import type { ExerciseProgress } from '../entity/exercise-progress.entity.ts'
import type { Placement, PlacementLevel } from '../entity/placement.entity.ts'
import type { Track } from '../entity/track.entity.ts'
import type { ExerciseRepository } from '../repository/exercise.repository.ts'
import type { TrackRepository } from '../repository/track.repository.ts'
import type { PremiumService } from './premium.service.ts'
import type { TrackLink } from './track.service.ts'
import { toTrackLink } from './track.service.ts'

export interface PathChapter {
  readonly slug: string
  readonly title: string
  readonly level: ChapterLevel
  readonly number: number
  readonly free: boolean
  /** Sous le niveau du positionnement : affiche comme connu, saute par le conseil. */
  readonly acquired: boolean
  /** Au moins un exercice, et tous reussis. */
  readonly completed: boolean
}

export interface LearningPath {
  readonly track: TrackLink
  /** Null quand le parcours vient de la derniere tentative, faute de positionnement. */
  readonly level: PlacementLevel | null
  readonly chapters: readonly PathChapter[]
  /** Meme dans un chapitre Premium : `free` dit au front d'afficher l'offre. */
  readonly nextExercise: {
    readonly chapter: string
    readonly exercise: string
    readonly title: string
    readonly free: boolean
  } | null
}

export type BadgeKind = 'first_exercise' | 'chapter_completed' | 'track_completed'

export interface Badge {
  readonly kind: BadgeKind
  readonly track: string | null
  readonly chapter: string | null
  readonly earnedAt: Date
}

interface CatalogChapter {
  readonly chapter: Chapter
  readonly number: number
  readonly exercises: readonly Exercise[]
}

interface CatalogTrack {
  readonly track: Track
  readonly chapters: readonly CatalogChapter[]
}

const levelRank = (level: ChapterLevel) => CHAPTER_LEVELS.indexOf(level)

/** Calcule tout a la lecture : un badge se deduit de `firstPassedAt`, qui n'est jamais efface. */
export class LearningPathService {
  private readonly tracks: TrackRepository
  private readonly exercises: ExerciseRepository
  private readonly premium: PremiumService

  constructor(tracks: TrackRepository, exercises: ExerciseRepository, premium: PremiumService) {
    this.tracks = tracks
    this.exercises = exercises
    this.premium = premium
  }

  /** Le catalogue lu une seule fois pour les deux : une requete par chapitre en base. */
  async describe(
    placement: Placement | null,
    progress: readonly ExerciseProgress[],
  ): Promise<{ readonly path: LearningPath | null; readonly badges: readonly Badge[] }> {
    const catalog = await this.catalog()
    return {
      path: this.pathIn(catalog, placement, progress),
      badges: this.badgesIn(catalog, progress),
    }
  }

  async path(
    placement: Placement | null,
    progress: readonly ExerciseProgress[],
  ): Promise<LearningPath | null> {
    return this.pathIn(await this.catalog(), placement, progress)
  }

  async badges(progress: readonly ExerciseProgress[]): Promise<readonly Badge[]> {
    return this.badgesIn(await this.catalog(), progress)
  }

  private pathIn(
    catalog: readonly CatalogTrack[],
    placement: Placement | null,
    progress: readonly ExerciseProgress[],
  ): LearningPath | null {
    const placed = placement && catalog.find((t) => t.track.id === placement.trackId)
    const target = placed ?? this.lastAttemptedTrack(catalog, progress)
    if (!target) {
      return null
    }
    const level = placed ? placement.level : null
    const passed = passedAt(progress)
    const chapters = target.chapters.map(({ chapter, number, exercises }) => ({
      slug: chapter.slug,
      title: chapter.title,
      level: chapter.level,
      number,
      free: this.premium.isFreeChapter(number),
      acquired:
        level !== null &&
        chapter.level !== 'ecosystem' &&
        levelRank(chapter.level) < levelRank(level),
      completed: exercises.length > 0 && exercises.every((e) => passed.has(e.id)),
    }))
    const next = target.chapters
      .filter((_, i) => !chapters[i]!.acquired)
      .flatMap((c) => c.exercises.map((exercise) => ({ ...c, exercise })))
      .find(({ exercise }) => !passed.has(exercise.id))
    return {
      track: toTrackLink(target.track),
      level,
      chapters,
      nextExercise: next
        ? {
            chapter: next.chapter.slug,
            exercise: next.exercise.slug,
            title: next.exercise.title,
            free: this.premium.isFreeChapter(next.number),
          }
        : null,
    }
  }

  private badgesIn(
    catalog: readonly CatalogTrack[],
    progress: readonly ExerciseProgress[],
  ): readonly Badge[] {
    const passed = passedAt(progress)
    if (passed.size === 0) {
      return []
    }
    const latest = (exercises: readonly Exercise[]): Date | null => {
      if (exercises.length === 0 || !exercises.every((e) => passed.has(e.id))) {
        return null
      }
      return new Date(Math.max(...exercises.map((e) => passed.get(e.id)!.getTime())))
    }
    const badges: Badge[] = [
      {
        kind: 'first_exercise',
        track: null,
        chapter: null,
        earnedAt: new Date(Math.min(...[...passed.values()].map((d) => d.getTime()))),
      },
    ]
    for (const { track, chapters } of catalog) {
      for (const { chapter, exercises } of chapters) {
        const earnedAt = latest(exercises)
        if (earnedAt) {
          badges.push({
            kind: 'chapter_completed',
            track: track.slug,
            chapter: chapter.slug,
            earnedAt,
          })
        }
      }
    }
    for (const { track, chapters } of catalog) {
      const earnedAt = latest(chapters.flatMap((c) => c.exercises))
      if (earnedAt) {
        badges.push({ kind: 'track_completed', track: track.slug, chapter: null, earnedAt })
      }
    }
    return badges.toSorted((a, b) => a.earnedAt.getTime() - b.earnedAt.getTime())
  }

  private lastAttemptedTrack(
    catalog: readonly CatalogTrack[],
    progress: readonly ExerciseProgress[],
  ): CatalogTrack | null {
    const last = progress.toSorted((a, b) => b.lastAttemptAt.getTime() - a.lastAttemptAt.getTime())
    for (const attempt of last) {
      const found = catalog.find((t) =>
        t.chapters.some((c) => c.exercises.some((e) => e.id === attempt.exerciseId)),
      )
      if (found) {
        return found
      }
    }
    return null
  }

  // Une requete apres l'autre : en parallele, Prisma ouvre une connexion par requete, bien plus lent.
  private async catalog(): Promise<readonly CatalogTrack[]> {
    const catalog: CatalogTrack[] = []
    for (const track of await this.tracks.listTracks()) {
      const chapters: CatalogChapter[] = []
      for (const [i, chapter] of (await this.tracks.listChapters(track.id)).entries()) {
        chapters.push({
          chapter,
          number: i + 1,
          exercises:
            track.programmingLanguage === null
              ? []
              : await this.exercises.listExercises(chapter.id),
        })
      }
      catalog.push({ track, chapters })
    }
    return catalog
  }
}

function passedAt(progress: readonly ExerciseProgress[]): ReadonlyMap<number, Date> {
  return new Map(
    progress.flatMap((p) => (p.firstPassedAt ? [[p.exerciseId, p.firstPassedAt] as const] : [])),
  )
}
