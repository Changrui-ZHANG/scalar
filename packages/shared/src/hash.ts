/**
 * Empreinte synchrone, non cryptographique (FNV-1a 32-bit).
 * Même texte → même empreinte hexadécimale de 8 caractères.
 * Sert uniquement pour la reconnaissance de textes (starterHash, useHighlight).
 */
export function hashText(text: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}
