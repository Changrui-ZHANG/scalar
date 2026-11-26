interface FetchErrorLike {
  statusCode?: number
  status?: number
  data?: { error?: unknown }
}

/** Statut HTTP d'une erreur de $fetch ; null si le serveur n'a pas répondu. */
export function apiErrorStatus(error: unknown): number | null {
  if (typeof error !== 'object' || error === null) return null
  const err = error as FetchErrorLike
  return err.statusCode ?? err.status ?? null
}

/**
 * Message à montrer à l'apprenant : celui de l'API quand elle en donne un
 * (« Email ou mot de passe incorrect. »), sinon le message de repli.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (apiErrorStatus(error) === null) {
    return 'Le serveur ne répond pas. Vérifiez votre connexion puis réessayez.'
  }
  const message = (error as FetchErrorLike).data?.error
  if (typeof message === 'string' && message !== '') {
    return message
  }
  return fallback
}

/** Adresse de retour après connexion : seulement un chemin du site, jamais un autre domaine. */
export function safeRedirect(value: unknown): string {
  if (typeof value !== 'string') return '/'
  if (!value.startsWith('/') || value.startsWith('//')) return '/'
  return value
}
