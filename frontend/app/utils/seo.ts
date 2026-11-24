import { stripMarkdown } from '@scalar/shared/markdown'

export function pageTitle(parts: readonly string[]): string {
  const filtered = parts.map((p) => p.trim()).filter((p) => p.length > 0)
  if (filtered.length === 0) {
    return 'Scalar'
  }
  return `${filtered.join(' · ')} — Scalar`
}

// Description tirée d'un texte (consigne d'exercice) : Markdown retiré, première
// phrase seulement, coupée au mot si elle dépasse `max` caractères (specs-site.md § 13).
export function firstSentence(text: string, max: number = 160): string {
  const plain = stripMarkdown(text).trim()
  if (!plain) return ''

  // Première phrase : jusqu'au premier « . », « ! » ou « ? » inclus.
  let sentence = plain
  const match = plain.match(/^[^.!?]+[.!?]/)
  if (match) {
    sentence = match[0].trim()
  }

  if (sentence.length <= max) {
    return sentence
  }

  // Trop longue : on garde les max - 1 premiers caractères (place pour « … »)…
  const cut = sentence.slice(0, max - 1)

  // … si la coupe tombe juste avant une espace, le dernier mot est entier : on le garde.
  if (sentence.charAt(max - 1) === ' ') {
    return `${cut}…`
  }

  // … sinon on retire le mot coupé en deux.
  const lastSpace = cut.lastIndexOf(' ')
  if (lastSpace > 0) {
    return `${cut.slice(0, lastSpace)}…`
  }
  return `${cut}…`
}
