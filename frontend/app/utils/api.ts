/**
 * Contrats de l'API, miroirs de `backend/src/services/exercise.service.ts`
 * (Parcours) et `lesson.service.ts` (Connaissance).
 */

export interface ApiResponse<T> {
  readonly success: boolean
  readonly data: T | null
  readonly error: string | null
}

// --- Parcours ------------------------------------------------------------------

export interface LanguageLink {
  readonly slug: string
  readonly label: string
}

export interface LanguageSummary extends LanguageLink {
  readonly summary: string
  readonly prerequisite: LanguageLink | null
}

export interface ExerciseSummary {
  readonly slug: string
  readonly title: string
  /** Rang affiche, a partir de 1. */
  readonly number: number
}

export interface ChapterSummary {
  readonly slug: string
  readonly title: string
  readonly number: number
  readonly exercises: readonly ExerciseSummary[]
}

export interface ChapterDetail extends ChapterSummary {
  readonly language: LanguageLink
  readonly summary: string
}

export interface TestCaseView {
  readonly args: readonly unknown[]
  readonly expected: unknown
  readonly label: string | null
}

export interface PublicExercise {
  readonly slug: string
  readonly title: string
  readonly number: number
  readonly statement: string
  readonly functionName: string
  readonly starterCode: string
  readonly hints: readonly string[]
  readonly testCases: readonly TestCaseView[]
  readonly language: LanguageLink & { readonly runtime: 'node' | 'node_strip_types' }
  readonly chapter: { readonly slug: string; readonly title: string; readonly number: number }
  readonly next: { readonly chapterSlug: string; readonly slug: string } | null
}

/** Fil d'un parcours, miroir de `TrackView` dans `lesson.service.ts`. */
export interface TrackChapter {
  readonly slug: string
  readonly title: string
  readonly number: number
  readonly lessons: readonly {
    readonly slug: string
    readonly title: string
    readonly summary: string
  }[]
  readonly exercises: readonly {
    readonly slug: string
    readonly title: string
    readonly statement: string
  }[]
}

export interface TrackView {
  readonly language: LanguageLink
  readonly chapters: readonly TrackChapter[]
}

// --- Execution et correction ---------------------------------------------------

/** Miroir de `ExecutionResult` dans `execution.service.ts`. */
export interface ExecutionResult {
  readonly status: 'OK' | 'TO' | 'OL' | 'EL' | 'RE' | 'SG' | 'XX'
  readonly label: string
  readonly run: {
    readonly stdout: string
    readonly stderr: string
    readonly code: number | null
    readonly signal: string | null
    readonly cpu_time?: number
    readonly wall_time?: number
  }
}

/** Miroir de `VerificationResult` dans `verification.service.ts`. */
export interface VerificationResult {
  readonly passed: boolean
  readonly passedCount: number
  readonly total: number
  readonly checks: readonly {
    readonly label: string
    readonly passed: boolean
    readonly detail: string | null
  }[]
  readonly execution: ExecutionResult
}

// --- Lecons --------------------------------------------------------------------

/** Section d'une lecon : un langage, ou une categorie valable pour tous. */
export interface SectionLink {
  readonly kind: 'language' | 'category'
  readonly slug: string
  readonly label: string
}

export interface LessonSummary {
  readonly slug: string
  readonly title: string
  readonly summary: string
  readonly number: number
}

export interface LessonDetail extends LessonSummary {
  readonly content: string
  readonly reviewedAt: string | null
  readonly section: SectionLink
  readonly category: { readonly slug: string; readonly label: string; readonly size: number }
  readonly chapters: readonly {
    readonly languageSlug: string
    readonly slug: string
    readonly title: string
    readonly number: number
  }[]
  readonly previous: { readonly slug: string; readonly title: string } | null
  readonly next: { readonly slug: string; readonly title: string } | null
}

// --- Outils --------------------------------------------------------------------

/**
 * Base de l'API selon le cote : le rendu serveur appelle le backend en direct,
 * le navigateur reste sur l'origine unique.
 */
export function apiUrl(path: string): string {
  const config = useRuntimeConfig()
  const base = import.meta.server ? config.apiInterne : config.public.apiBase
  return `${base}${path}`
}

/** Segment d'URL sur : un slug vient de l'URL, donc de l'utilisateur. */
export const seg = (value: string): string => encodeURIComponent(value)

/** Message affichable d'une erreur `$fetch`, sans jamais exposer de detail interne. */
export function apiErrorMessage(err: unknown, fallback: string): string {
  const envelope = (err as { data?: Partial<ApiResponse<never>> } | null)?.data
  return envelope?.error ?? fallback
}

/** Rendu d'un appel de test, ex. `swap(1, 2)`. */
export function formatCall(functionName: string, args: readonly unknown[]): string {
  return `${functionName}(${args.map((a) => JSON.stringify(a)).join(', ')})`
}
