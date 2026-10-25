/** Rend une valeur de cellule lisible, quel que soit son type PostgreSQL. */
export function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '∅'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

/** Coupe une valeur trop longue pour tenir dans une cellule de tableau. */
export function truncate(text: string, max = 80): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}
