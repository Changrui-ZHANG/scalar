import type { ChapterLevel } from '@scalar/shared/enums'
import type { TrackRef, TrackView } from '@scalar/shared/api'

export type EpisodeKind = 'lesson' | 'exercise'

export interface Episode {
  readonly kind: EpisodeKind
  readonly key: string // lessonKey / exerciseKey : clé de progression (§ 9)
  readonly trackSlug: string
  readonly chapter: {
    readonly slug: string
    readonly title: string
    readonly number: number // chapters[].number de l'API
    readonly level: ChapterLevel
  }
  readonly slug: string
  readonly title: string
  readonly excerpt: string // résumé (leçon) ou stripMarkdown(consigne) (exercice) : carte Reprendre, une ligne
  readonly indexInChapter: number // « épisode i sur k » : leçons puis exercices, à partir de 1
  readonly chapterEpisodeCount: number // k
  readonly path: string // lessonPath / exercisePath
}

export type TrackStatus = 'not_started' | 'in_progress' | 'completed' // aussi pour un chapitre
export type TrackFilter = 'all' | TrackStatus // pilules de /parcours (§ 5.1)

export interface TrackProgress {
  readonly done: number // épisodes terminés encore présents dans le fil
  readonly total: number
  readonly percent: number // floor(done × 100 / total), 0 si total = 0 (§ 9)
  readonly status: TrackStatus
  readonly current: Episode | null // premier non terminé ; premier du fil si terminé ; null sans épisode
}

export interface TrackCard {
  readonly view: TrackView // view.track : le parcours ; compteurs chapitres / leçons / exercices
  readonly progress: TrackProgress
  readonly prerequisite: TrackRef | null // « Conseillé après X » : prérequis non commencé, sinon null
}

// Carte Reprendre de l'accueil habitué (§ 4.2)
export type ResumeTarget =
  | {
      readonly kind: 'resume' | 'start' // start : commencés tous terminés, premier parcours non commencé ; bouton « Commencer »
      readonly card: TrackCard
      readonly episode: Episode
      readonly upNext: readonly Episode[] // 4 au plus, après episode
    }
  | { readonly kind: 'all_done' } // « Tous les parcours sont terminés », sans bouton
