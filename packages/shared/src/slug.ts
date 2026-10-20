import { MAX_SLUG_LENGTH } from './limits.ts'

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const RESERVED_CHAPTER_SLUGS = ['lecon'] as const

/**
 * Normalise un texte en slug URL :
 * minuscules, accents retirés, autre caractère → '-', tirets fusionnés,
 * coupe à MAX_SLUG_LENGTH puis tirets de bord retirés ; '' si rien d'utilisable.
 */
export function slugify(text: string): string {
  const normalized = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (!normalized) {
    return ''
  }

  const truncated = normalized.slice(0, MAX_SLUG_LENGTH).replace(/^-+|-+$/g, '')
  return truncated
}
