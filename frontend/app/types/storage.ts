import type { ProgrammingLanguage } from '@scalar/shared/enums'
import type { IsoDateTime } from '@scalar/shared/api'

// localStorage scalar:progress:v4 (JSON)
export interface StoredProgress {
  readonly started: readonly string[] // slugs de parcours
  readonly completed: Readonly<Record<string, readonly string[]>> // parcours → clés lesson:… exercise:… chapter:…
  readonly lastVisited: Readonly<Record<string, IsoDateTime>>
}

// localStorage scalar:drafts:v2 (JSON) : { "<parcours>:exercise:<chapitre>:<exercice>": StoredDraft }
export interface StoredDraft {
  readonly code: string
  readonly starterHash: string | null // null : entrée convertie de scalar:drafts:v1, restaurée sans l'encart
}
export type StoredDrafts = Readonly<Record<string, StoredDraft>>

// localStorage scalar:hints:v1 (JSON) : { "<sous-clé du brouillon>": nombre d'indices révélés }
export type StoredHints = Readonly<Record<string, number>>

// localStorage scalar:theme:v1 : texte brut 'light' | 'dark' | 'system' (lu tel quel par le script de thème) ; absent = system
export type ThemeChoice = 'light' | 'dark' | 'system'

// localStorage scalar:sandbox:v1 (JSON) : { language, code }
export interface SandboxState {
  readonly language: ProgrammingLanguage
  readonly code: string
}

// sessionStorage scalar:sandbox-seed:v1 (JSON) : code de « Essayer dans le bac à sable », effacé à la lecture
export interface SandboxSeed {
  readonly code: string
  readonly language: ProgrammingLanguage
}
