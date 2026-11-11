/** Contenu cote backoffice : la forme renvoyee par `/api/v1/admin/*`. */

export type ContentStatus = 'draft' | 'published' | 'archived'
export type ProgrammingLanguage = 'javascript' | 'typescript'
export type ChapterLevel = 'beginner' | 'intermediate' | 'advanced' | 'ecosystem'
export type SolutionCheckStatus = 'not_checked' | 'passed' | 'failed'

export interface Track {
  readonly id: number
  readonly slug: string
  readonly position: number
  readonly name: string
  readonly summary: string
  /** Nul pour un parcours de lecons seulement. */
  readonly programmingLanguage: ProgrammingLanguage | null
  readonly status: ContentStatus
}

export interface Chapter {
  readonly id: number
  readonly trackId: number
  readonly slug: string
  readonly level: ChapterLevel
  /** Rang dans le niveau, a partir de 1. */
  readonly position: number
  readonly title: string
  readonly summary: string
  readonly status: ContentStatus
}

export interface TestCase {
  /** Arguments passes a la fonction : toujours un tableau. */
  readonly arguments: readonly unknown[]
  readonly expectedResult: unknown
  readonly description: string | null
  readonly isHidden: boolean
}

export interface Exercise {
  readonly id: number
  readonly chapterId: number
  readonly slug: string
  /** Rang dans le chapitre, a partir de 1. */
  readonly position: number
  readonly title: string
  /** Markdown. */
  readonly instructions: string
  readonly functionName: string
  readonly starterCode: string
  readonly solutionCode: string
  readonly hints: readonly string[]
  readonly testCases: readonly TestCase[]
  readonly solutionCheckStatus: SolutionCheckStatus
  readonly status: ContentStatus
}

export interface Check {
  readonly label: string
  readonly passed: boolean
  readonly detail: string | null
}

export interface SolutionCheck {
  readonly exercise: Exercise
  readonly passed: boolean
  readonly checks: readonly Check[]
  readonly stderr: string
}

/** Verdict d'un essai comme un apprenant : cas caches masques. */
export interface Verification {
  readonly passed: boolean
  readonly passedCount: number
  readonly total: number
  readonly checks: readonly Check[]
  readonly execution: { readonly run: { readonly stdout: string; readonly stderr: string } }
}

export interface OutlineChapter {
  readonly chapter: Chapter
  readonly exercises: readonly Exercise[]
}

export const STATUS_LABELS: Readonly<Record<ContentStatus, string>> = {
  draft: 'Brouillon',
  published: 'Publié',
  archived: 'Archivé',
}

export const SOLUTION_CHECK_LABELS: Readonly<Record<SolutionCheckStatus, string>> = {
  not_checked: 'Non vérifiée',
  passed: 'Vérifiée',
  failed: 'En échec',
}

export const LANGUAGE_LABELS: Readonly<Record<ProgrammingLanguage, string>> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
}

export const NO_LANGUAGE_LABEL = 'Aucun, leçons seulement'

export const LEVEL_LABELS: Readonly<Record<ChapterLevel, string>> = {
  beginner: 'Débutant',
  intermediate: 'Intermédiaire',
  advanced: 'Avancé',
  ecosystem: 'Écosystème',
}

/** « Les Boucles for ! » -> « les-boucles-for ». */
export const slugify = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export type SaveResult<T> =
  | { readonly ok: true; readonly item: T }
  /** `field` : le champ du formulaire a marquer, sinon l'erreur s'affiche en notification. */
  | { readonly ok: false; readonly field: 'slug' | null; readonly message: string }
