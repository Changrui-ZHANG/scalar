import type { ChapterLevel, ExecutionStatus, ProgrammingLanguage } from '@scalar/shared/enums'
import type { ApiPublicResponse, LessonHeading } from '@scalar/shared/api'

export type { ChapterLevel, ExecutionStatus, LessonHeading, ProgrammingLanguage }

/**
 * Contrats de l'API, miroirs des services du backend : parcours, lecons,
 * exercices, execution et verification.
 */

export type ApiResponse<T> = ApiPublicResponse<T>

// --- Parcours ------------------------------------------------------------------

export interface TrackLink {
  readonly slug: string
  readonly name: string
}

export interface TrackSummary extends TrackLink {
  readonly summary: string
  readonly programmingLanguage: ProgrammingLanguage | null
  readonly prerequisite: TrackLink | null
}

/** Un chapitre du fil : ses lecons, puis ses exercices. */
export interface TrackChapter {
  readonly slug: string
  readonly title: string
  readonly level: ChapterLevel
  /** Rang dans tout le parcours, a partir de 1. */
  readonly number: number
  readonly lessons: readonly {
    readonly slug: string
    readonly title: string
    readonly summary: string
    readonly headings: readonly LessonHeading[]
  }[]
  readonly exercises: readonly {
    readonly slug: string
    readonly title: string
    readonly instructions: string
  }[]
}

/** Fil d'un parcours, chapitres deja dans l'ordre. */
export interface TrackView {
  readonly track: TrackLink & { readonly programmingLanguage: ProgrammingLanguage | null }
  readonly chapters: readonly TrackChapter[]
}

export interface ChapterLink {
  readonly slug: string
  readonly title: string
  readonly number: number
}

// --- Lecons --------------------------------------------------------------------

export interface LessonDetail {
  readonly slug: string
  readonly title: string
  readonly summary: string
  /** Contenu Markdown complet. */
  readonly body: string
  readonly lastReviewedAt: string | null
  readonly number: number
  readonly track: TrackLink
  readonly chapter: ChapterLink
}

// --- Exercices -----------------------------------------------------------------

export interface PublicTestCase {
  readonly arguments: readonly unknown[]
  readonly expectedResult: unknown
  readonly description: string | null
}

export interface ExerciseDetail {
  readonly slug: string
  readonly title: string
  readonly number: number
  readonly instructions: string
  readonly functionName: string
  readonly starterCode: string
  readonly hints: readonly string[]
  readonly testCases: readonly PublicTestCase[]
  readonly track: TrackLink & { readonly programmingLanguage: ProgrammingLanguage }
  readonly chapter: ChapterLink
  readonly next: { readonly chapterSlug: string; readonly slug: string } | null
}

export type PublicExercise = ExerciseDetail

// --- Execution et verification -------------------------------------------------

export interface ExecutionRun {
  readonly stdout: string
  readonly stderr: string
  readonly output: string
  readonly code: number | null
  readonly signal: string | null
  readonly wall_time: number | null
}

export interface ExecutionResult {
  readonly status: ExecutionStatus
  readonly label: string
  readonly run: ExecutionRun
}

export interface VerificationCheck {
  readonly label: string
  readonly passed: boolean
  readonly detail: string | null
  readonly actual?: unknown
}

export interface VerificationResult {
  readonly passed: boolean
  readonly passedCount: number
  readonly total: number
  readonly checks: readonly VerificationCheck[]
  readonly execution: ExecutionResult
}

// --- Fonctions utilitaires -----------------------------------------------------

/** Segment d'URL sûr : un slug vient de l'URL, donc de l'utilisateur. */
export const seg = (value: string): string => encodeURIComponent(value)

/**
 * Base de l'API selon le côté : le rendu serveur appelle le backend en direct,
 * le navigateur reste sur l'origine unique.
 */
export function apiUrl(path: string): string {
  const config = useRuntimeConfig()
  const base = import.meta.server
    ? (config.apiInternalBase ?? config.apiInterne ?? 'http://backend:3000')
    : (config.public.apiBase ?? '/api')
  return `${base}${path}`
}

/** Message affichable d'une erreur `$fetch`, sans jamais exposer de détail interne. */
export function apiErrorMessage(err: unknown, fallback: string): string {
  const envelope = (err as { data?: Partial<ApiResponse<never>> } | null)?.data
  return envelope?.error ?? fallback
}

/** Rendu d'un appel de test, ex. `swap(1, 2)`. */
export function formatCall(functionName: string, args: readonly unknown[]): string {
  return `${functionName}(${args.map((a) => JSON.stringify(a)).join(', ')})`
}
