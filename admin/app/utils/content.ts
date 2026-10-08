/**
 * Contenu cote backoffice : forme du futur schema (languages, chapters,
 * exercices) et regle d'ajout commune. Fonctions pures : le stockage arrive
 * en parametre.
 */

export type ContentStatus = 'draft' | 'published' | 'archived'
export type LanguageRuntime = 'node' | 'node_strip_types'

export interface Language {
  readonly id: number
  readonly slug: string
  /** Rang dans la liste des parcours, a partir de 1. */
  readonly position: number
  readonly label: string
  readonly summary: string
  readonly runtime: LanguageRuntime
  readonly status: ContentStatus
}

export interface Chapter {
  readonly id: number
  readonly languageId: number
  readonly slug: string
  /** Rang dans le parcours du langage, a partir de 1. */
  readonly position: number
  readonly title: string
  readonly summary: string
  readonly status: ContentStatus
}

export interface TestCase {
  /** Arguments passes a la fonction : toujours un tableau. */
  readonly args: readonly unknown[]
  readonly expected: unknown
  readonly label: string
  readonly isHidden: boolean
}

export interface Exercise {
  readonly id: number
  readonly chapterId: number
  readonly slug: string
  /** Rang dans le chapitre, a partir de 1. */
  readonly position: number
  readonly title: string
  /** Markdown, affiche par `RichText` cote site. */
  readonly statement: string
  readonly functionName: string
  readonly starterCode: string
  readonly solutionCode: string
  readonly hints: readonly string[]
  readonly testCases: readonly TestCase[]
  readonly status: ContentStatus
}

export const STATUS_LABELS: Readonly<Record<ContentStatus, string>> = {
  draft: 'Brouillon',
  published: 'Publié',
  archived: 'Archivé',
}

export const RUNTIME_LABELS: Readonly<Record<LanguageRuntime, string>> = {
  node: 'Node.js',
  node_strip_types: 'Node.js, types retirés avant exécution',
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
  | { readonly ok: false; readonly field: 'slug'; readonly message: string }

const SLUG_TAKEN = {
  ok: false,
  field: 'slug',
  message: 'Ce slug est déjà utilisé ici.',
} as const

/**
 * Ajoute un element en derniere position parmi `siblings` (meme langage, meme
 * chapitre, ou tous les langages). Le slug doit y etre unique, comme le
 * garantira la base.
 */
export function append<I extends { readonly slug: string }>(
  siblings: readonly { readonly slug: string; readonly position: number }[],
  input: I,
  id: number,
): SaveResult<I & { readonly id: number; readonly position: number }> {
  if (siblings.some((s) => s.slug === input.slug)) {
    return SLUG_TAKEN
  }
  const position = Math.max(0, ...siblings.map((s) => s.position)) + 1
  return { ok: true, item: { ...input, id, position } }
}

/**
 * Remplace les champs saisis d'un element existant : id et position restent.
 * Son propre slug ne compte pas comme un doublon.
 */
export function replace<T extends { readonly id: number; readonly slug: string }, I>(
  siblings: readonly T[],
  current: T,
  input: I & { readonly slug: string },
): SaveResult<T & I> {
  if (siblings.some((s) => s.id !== current.id && s.slug === input.slug)) {
    return SLUG_TAKEN
  }
  return { ok: true, item: { ...current, ...input } }
}
