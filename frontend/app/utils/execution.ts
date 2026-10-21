export const CODE_MAX_BYTES = 64 * 1024
export const CODE_TOO_LARGE_MESSAGE = 'Votre code dépasse 64 Kio.'

/**
 * Calcule la taille en octets UTF-8 d'une chaîne de code.
 */
export function getCodeByteLength(code: string): number {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(code).length
  }
  return Buffer.from(code, 'utf-8').length
}

export function isCodeTooLarge(code: string): boolean {
  return getCodeByteLength(code) > CODE_MAX_BYTES
}

/**
 * Transforme un statut HTTP ou code d'erreur réseau en message apprenant (§ 7.2).
 */
export function runErrorMessage(
  statusOrError: number | string | { statusCode?: number; status?: number; message?: string },
  context: 'run' | 'verify' = 'run',
): string {
  let status: number | null = null
  let apiMessage: string | null = null

  if (typeof statusOrError === 'number') {
    status = statusOrError
  } else if (typeof statusOrError === 'object' && statusOrError !== null) {
    status = statusOrError.statusCode ?? statusOrError.status ?? null
    apiMessage = statusOrError.message ?? null
  }

  if (status === 400 && apiMessage) {
    return apiMessage
  }
  if (status === 404 && context === 'verify') {
    return "Cet exercice n'est plus en ligne. Votre code reste enregistré ici."
  }
  if (status === 429) {
    return apiMessage ?? "Trop d'exécutions en peu de temps. Réessayez dans une minute."
  }
  if (status === 503) {
    return "Le moteur d'exécution est momentanément indisponible."
  }
  if (status && status >= 500 && status < 600) {
    return 'Une erreur est survenue. Réessayez dans un instant.'
  }

  return "Le service d'exécution n'a pas répondu. Vérifiez votre connexion puis réessayez."
}
