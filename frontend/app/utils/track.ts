import { stripMarkdown } from '@scalar/shared/markdown'
import type { TrackRef, TrackSummary, TrackView, TrackViewChapter } from '@scalar/shared/api'
import type {
  Episode,
  ResumeTarget,
  TrackCard,
  TrackFilter,
  TrackProgress,
  TrackStatus,
} from '~/types/episode'
import type { StoredProgress } from '~/types/storage'

// --- Progression & Cles --------------------------------------------------------

export const lessonKey = (chapter: string, lesson: string): string => `lesson:${chapter}:${lesson}`
export const exerciseKey = (chapter: string, exercise: string): string =>
  `exercise:${chapter}:${exercise}`
export const chapterKey = (chapter: string): string => `chapter:${chapter}`
export const draftKey = (track: string, chapter: string, exercise: string): string =>
  `${track}:exercise:${chapter}:${exercise}`

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0 || !parts[0]) return ''
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  const first = parts[0][0] ?? ''
  const second = parts[1]?.[0] ?? ''
  return (first + second).toUpperCase()
}

export function trackPath(track: string, chapter?: string): string {
  return chapter ? `/parcours/${track}#${chapter}` : `/parcours/${track}`
}

export function lessonPath(
  track: string,
  chapter: string,
  lesson: string,
  headingId?: string,
): string {
  const base = `/parcours/${track}/${chapter}/lecon/${lesson}`
  return headingId ? `${base}#${headingId}` : base
}

export function exercisePath(track: string, chapter: string, exercise: string): string {
  return `/parcours/${track}/${chapter}/${exercise}`
}

export function listEpisodes(view: TrackView): readonly Episode[] {
  const trackSlug = view.track.slug
  const episodes: Episode[] = []

  for (const chapter of view.chapters) {
    const chapterEpisodeCount = chapter.lessons.length + chapter.exercises.length
    let indexInChapter = 1

    for (const lesson of chapter.lessons) {
      episodes.push({
        kind: 'lesson',
        key: lessonKey(chapter.slug, lesson.slug),
        trackSlug,
        chapter: {
          slug: chapter.slug,
          title: chapter.title,
          number: chapter.number,
          level: chapter.level,
        },
        slug: lesson.slug,
        title: lesson.title,
        excerpt: lesson.summary,
        indexInChapter: indexInChapter++,
        chapterEpisodeCount,
        path: lessonPath(trackSlug, chapter.slug, lesson.slug),
      })
    }

    for (const exercise of chapter.exercises) {
      episodes.push({
        kind: 'exercise',
        key: exerciseKey(chapter.slug, exercise.slug),
        trackSlug,
        chapter: {
          slug: chapter.slug,
          title: chapter.title,
          number: chapter.number,
          level: chapter.level,
        },
        slug: exercise.slug,
        title: exercise.title,
        excerpt: stripMarkdown(exercise.instructions).replace(/\s+/g, ' ').trim(),
        indexInChapter: indexInChapter++,
        chapterEpisodeCount,
        path: exercisePath(trackSlug, chapter.slug, exercise.slug),
      })
    }
  }

  return episodes
}

export function trackProgress(
  episodes: readonly Episode[],
  completed: ReadonlySet<string>,
): TrackProgress {
  const total = episodes.length
  let done = 0
  let current: Episode | null = null

  for (const ep of episodes) {
    if (completed.has(ep.key)) {
      done++
    } else if (!current) {
      current = ep
    }
  }

  const percent = total === 0 ? 0 : Math.floor((done * 100) / total)
  let status: TrackStatus = 'not_started'
  if (total > 0 && done === total) {
    status = 'completed'
    current = episodes[0] ?? null
  } else if (done > 0) {
    status = 'in_progress'
  }

  return {
    done,
    total,
    percent,
    status,
    current,
  }
}

export function chapterStatus(
  chapter: TrackViewChapter,
  episodes: readonly Episode[],
  completed: ReadonlySet<string>,
): TrackStatus {
  const chapterEpisodes = episodes.filter((e) => e.chapter.slug === chapter.slug)
  const total = chapterEpisodes.length
  if (total === 0) return 'not_started'

  let done = 0
  for (const ep of chapterEpisodes) {
    if (completed.has(ep.key)) done++
  }

  if (done === total) return 'completed'
  if (done > 0) return 'in_progress'
  return 'not_started'
}

export function chapterTarget(
  chapterSlug: string,
  episodes: readonly Episode[],
  completed: ReadonlySet<string>,
): Episode | null {
  const chapterEpisodes = episodes.filter((e) => e.chapter.slug === chapterSlug)
  if (chapterEpisodes.length === 0) return null
  return chapterEpisodes.find((e) => !completed.has(e.key)) ?? chapterEpisodes[0] ?? null
}

export function prerequisiteToShow(
  track: TrackSummary,
  started: readonly string[],
): TrackRef | null {
  if (!track.prerequisite) return null
  return started.includes(track.prerequisite.slug) ? null : track.prerequisite
}

export function matchesFilter(status: TrackStatus, filter: TrackFilter): boolean {
  if (filter === 'all') return true
  return status === filter
}

export function buildTrackCard(view: TrackView, progress: StoredProgress): TrackCard {
  const trackSlug = view.track.slug
  const completedKeys = progress.completed[trackSlug] ?? []
  const completedSet = new Set(completedKeys)
  const episodes = listEpisodes(view)
  let prog = trackProgress(episodes, completedSet)

  if (progress.started.includes(trackSlug) && prog.status === 'not_started' && prog.total > 0) {
    prog = {
      ...prog,
      status: 'in_progress',
    }
  }

  return {
    view,
    progress: prog,
    prerequisite: prerequisiteToShow(view.track, progress.started),
  }
}

export function pickResume(
  cards: readonly TrackCard[],
  startedByRecency: readonly string[],
): ResumeTarget | null {
  if (cards.length === 0) return null

  const cardsWithEpisodes = cards.filter((c) => c.progress.total > 0)
  if (cardsWithEpisodes.length === 0) return null

  const allDone = cardsWithEpisodes.every((c) => c.progress.status === 'completed')
  if (allDone) {
    return { kind: 'all_done' }
  }

  for (const slug of startedByRecency) {
    const card = cards.find((c) => c.view.track.slug === slug)
    if (card && card.progress.total > 0 && card.progress.status !== 'completed') {
      const episodes = listEpisodes(card.view)
      const episode = card.progress.current ?? episodes[0]!
      const idx = episodes.findIndex((e) => e.key === episode.key)
      const upNext = idx !== -1 ? episodes.slice(idx + 1, idx + 5) : []
      return {
        kind: 'resume',
        card,
        episode,
        upNext,
      }
    }
  }

  const startedSet = new Set(startedByRecency)
  const hasAnyStarted = cards.some((c) => startedSet.has(c.view.track.slug))
  if (hasAnyStarted) {
    const firstUnstarted = cards.find(
      (c) => c.progress.status === 'not_started' && c.progress.total > 0,
    )
    if (firstUnstarted) {
      const episodes = listEpisodes(firstUnstarted.view)
      const episode = episodes[0]!
      const upNext = episodes.slice(1, 5)
      return {
        kind: 'start',
        card: firstUnstarted,
        episode,
        upNext,
      }
    }
  }

  return null
}
