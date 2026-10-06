/**
 * Fil d'un parcours : chapitres, lecons et exercices ramenes a une seule suite
 * d'episodes, numerotee en continu d'un chapitre a l'autre. Fonctions pures :
 * la progression arrive en parametre, elle n'est jamais lue ici.
 */

export type EpisodeType = 'lesson' | 'exercise'
export type EpisodeStatus = 'completed' | 'current' | 'todo'
export type TrackStatus = 'todo' | 'active' | 'completed'

export interface TrackEpisode {
  readonly key: string
  /** Rang dans tout le parcours, a partir de 1 : jamais remis a 1 par chapitre. */
  readonly number: number
  readonly type: EpisodeType
  readonly slug: string
  readonly title: string
  /** Resume d'une lecon ou consigne d'un exercice. */
  readonly text: string
  readonly languageSlug: string
  readonly chapterSlug: string
  readonly chapterNumber: number
  readonly chapterTitle: string
  readonly route: string
  readonly status: EpisodeStatus
}

export interface TrackProgress {
  readonly done: number
  readonly total: number
  readonly percent: number
}

/** Cles de progression : un slug de lecon est unique dans son langage, un exercice dans son chapitre. */
export const lessonKey = (lesson: string): string => `lesson:${lesson}`
export const exerciseKey = (chapter: string, exercise: string): string =>
  `exercise:${chapter}:${exercise}`

export const EPISODE_TYPE_LABELS: Readonly<Record<EpisodeType, string>> = {
  lesson: 'Leçon',
  exercise: 'Exercice',
}

export const EPISODE_STATUS_LABELS: Readonly<Record<EpisodeStatus, string>> = {
  completed: 'Terminé',
  current: 'À suivre',
  todo: 'À faire',
}

export const TRACK_STATUS_LABELS: Readonly<Record<TrackStatus, string>> = {
  todo: 'Non commencé',
  active: 'En cours',
  completed: 'Terminé',
}

export type TrackFilter = 'all' | TrackStatus

export const TRACK_FILTERS: readonly { readonly value: TrackFilter; readonly label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'active', label: 'En cours' },
  { value: 'todo', label: 'Non commencés' },
  { value: 'completed', label: 'Terminés' },
]

/** Numero affiche sur deux chiffres : 04. */
export const padNumber = (n: number): string => String(n).padStart(2, '0')

export function buildEpisodes(track: TrackView, completed: readonly string[]): TrackEpisode[] {
  const language = track.language.slug
  const flat = track.chapters.flatMap((chapter) => {
    const base = {
      languageSlug: language,
      chapterSlug: chapter.slug,
      chapterNumber: chapter.number,
      chapterTitle: chapter.title,
    }
    return [
      ...chapter.lessons.map((l) => ({
        ...base,
        key: lessonKey(l.slug),
        type: 'lesson' as const,
        slug: l.slug,
        title: l.title,
        text: l.summary,
        route: `/parcours/${language}/lecon/${l.slug}`,
      })),
      ...chapter.exercises.map((e) => ({
        ...base,
        key: exerciseKey(chapter.slug, e.slug),
        type: 'exercise' as const,
        slug: e.slug,
        title: e.title,
        text: e.statement,
        route: `/parcours/${language}/${chapter.slug}/${e.slug}`,
      })),
    ]
  })

  const done = new Set(completed)
  const current = flat.findIndex((e) => !done.has(e.key))
  return flat.map((e, i) => ({
    ...e,
    number: i + 1,
    status: done.has(e.key) ? 'completed' : i === current ? 'current' : 'todo',
  }))
}

export function progressOf(episodes: readonly TrackEpisode[]): TrackProgress {
  const done = episodes.filter((e) => e.status === 'completed').length
  const total = episodes.length
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) }
}

/** Un parcours ouvert ou entame est en cours ; il n'est termine que si tout l'est. */
export function trackStatus(episodes: readonly TrackEpisode[], started: boolean): TrackStatus {
  const { done, total } = progressOf(episodes)
  if (total > 0 && done === total) {
    return 'completed'
  }
  return started || done > 0 ? 'active' : 'todo'
}

/** Le premier episode non termine : celui qu'ouvre « Reprendre ». */
export const firstIncomplete = (episodes: readonly TrackEpisode[]): TrackEpisode | null =>
  episodes.find((e) => e.status !== 'completed') ?? null

/** L'episode qui suit, chapitre suivant compris ; null apres le dernier. */
export function nextEpisode(episodes: readonly TrackEpisode[], key: string): TrackEpisode | null {
  const index = episodes.findIndex((e) => e.key === key)
  return index === -1 ? null : (episodes[index + 1] ?? null)
}

/** La lecon a relire pour un exercice : la derniere qui le precede dans son chapitre. */
export function relatedLesson(episodes: readonly TrackEpisode[], key: string): TrackEpisode | null {
  const index = episodes.findIndex((e) => e.key === key)
  const exercise = episodes[index]
  if (!exercise) {
    return null
  }
  return (
    episodes
      .slice(0, index)
      .filter((e) => e.type === 'lesson' && e.chapterSlug === exercise.chapterSlug)
      .at(-1) ?? null
  )
}

// --- Recherche -----------------------------------------------------------------

/** Sans accents ni casse : « Décision » se trouve en tapant « decision ». */
export const normalize = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

const contains = (text: string, query: string): boolean => normalize(text).includes(query)

/** Episodes dont le titre, le texte ou le chapitre contient `query`, deja normalisee. */
export function searchEpisodes(episodes: readonly TrackEpisode[], query: string): TrackEpisode[] {
  if (query === '') {
    return []
  }
  return episodes.filter((e) => [e.title, e.text, e.chapterTitle].some((t) => contains(t, query)))
}

export const languageMatches = (language: LanguageSummary, query: string): boolean =>
  query !== '' && [language.label, language.summary].some((t) => contains(t, query))
