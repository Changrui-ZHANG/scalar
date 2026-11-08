export type ApiFailure = {
  readonly ok: false
  /** Nul si le serveur n'a pas repondu. */
  readonly status: number | null
  readonly message: string
}

export type ApiResult<T> = { readonly ok: true; readonly data: T } | ApiFailure

const UNREACHABLE = 'Le serveur ne répond pas : réessayez dans un instant.'

export function toApiFailure(error: unknown): ApiFailure {
  const { status, data } = error as { status?: number; data?: { error?: unknown } | null }
  const message = data?.error
  return {
    ok: false,
    status: status ?? null,
    message: typeof message === 'string' ? message : UNREACHABLE,
  }
}

/** L'API ne renvoie qu'un message : seul le mot « slug » permet de viser le bon champ. */
export const toSaveResult = <T>(result: ApiResult<T>): SaveResult<T> =>
  result.ok
    ? { ok: true, item: result.data }
    : { ok: false, field: /slug/i.test(result.message) ? 'slug' : null, message: result.message }

const DEFAULT_PAGE = '/parcours'

/** Seul un chemin de l'application est suivi : jamais une adresse venue d'un lien forge. */
export const safeRedirect = (target: unknown): string =>
  typeof target === 'string' && /^\/(?![/\\])/.test(target) ? target : DEFAULT_PAGE
