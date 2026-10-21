// types/search.ts (§ 3.1, § 5.1)
export type SearchEntryKind = 'track' | 'chapter' | 'lesson' | 'heading' | 'exercise'

export interface SearchEntry {
  readonly kind: SearchEntryKind
  readonly trackSlug: string
  readonly trackName: string
  readonly chapterNumber: number | null // null pour un parcours
  readonly title: string // texte affiché (intertitre pour 'heading')
  readonly haystack: string // texte cherché, déjà normalisé : titre (+ résumé d'une leçon)
  readonly path: string // adresse ; '…/lecon/:lesson#<id>' pour un intertitre
}

export interface SearchResult {
  readonly entry: SearchEntry
  readonly score: number // plus grand = mieux classé
}

export interface SearchGroup {
  readonly trackSlug: string
  readonly trackName: string
  readonly results: readonly SearchResult[] // SEARCH_GROUP_LIMIT au plus
}
