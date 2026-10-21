export function pageTitle(parts: readonly string[]): string {
  const filtered = parts.map((p) => p.trim()).filter((p) => p.length > 0)
  if (filtered.length === 0) {
    return 'Scalar'
  }
  return `${filtered.join(' · ')} — Scalar`
}

export function firstSentence(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return ''
  const match = trimmed.match(/^([^.!?]+[.!?])/)
  return match && match[1] ? match[1].trim() : trimmed
}
