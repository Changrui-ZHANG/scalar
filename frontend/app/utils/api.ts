/** Contrats de l'API du parcours, miroir de `backend/src/services/exercise.service.ts`. */

export interface ApiResponse<T> {
  readonly success: boolean
  readonly data: T | null
  readonly error: string | null
}

export interface ExerciseSummary {
  readonly slug: string
  readonly title: string
  readonly position: number
}

export interface ChapterSummary {
  readonly slug: string
  readonly title: string
  readonly position: number
  readonly exercises: readonly ExerciseSummary[]
}

export interface ChapterDetail extends ChapterSummary {
  readonly language: string
  readonly lesson: string
}

export interface TestCase {
  readonly args: readonly unknown[]
  readonly expected: unknown
}

export interface PublicExercise {
  readonly slug: string
  readonly title: string
  readonly position: number
  readonly statement: string
  readonly functionName: string
  readonly starterCode: string
  readonly hints: readonly string[]
  readonly tests: readonly TestCase[]
  readonly chapter: { readonly slug: string; readonly title: string }
  readonly next: { readonly slug: string; readonly chapterSlug: string } | null
}

/**
 * Base de l'API selon le cote : le rendu serveur appelle le backend en direct,
 * le navigateur reste sur l'origine unique.
 */
export function apiUrl(path: string): string {
  const config = useRuntimeConfig()
  const base = import.meta.server ? config.apiInterne : config.public.apiBase
  return `${base}${path}`
}

/** Message affichable d'une erreur `$fetch`, sans jamais exposer de detail interne. */
export function apiErrorMessage(err: unknown, fallback: string): string {
  const envelope = (err as { data?: Partial<ApiResponse<never>> } | null)?.data
  return envelope?.error ?? fallback
}

/** Rendu d'un appel de test, ex. `swap(1, 2)`. */
export function formatCall(functionName: string, args: readonly unknown[]): string {
  return `${functionName}(${args.map((a) => JSON.stringify(a)).join(', ')})`
}
