import { createError } from '#app'

interface ErrorWithStatus {
  statusCode?: number
  status?: number
  statusMessage?: string
  message?: string
}

export function toPageError(error: unknown) {
  if (typeof error === 'object' && error !== null) {
    const err = error as ErrorWithStatus
    const statusCode = err.statusCode ?? err.status ?? 500
    const statusMessage = err.statusMessage ?? err.message ?? (statusCode === 404 ? 'Page introuvable' : 'Erreur serveur')
    return createError({
      statusCode,
      statusMessage,
      fatal: true,
    })
  }

  return createError({
    statusCode: 500,
    statusMessage: typeof error === 'string' ? error : 'Une erreur est survenue',
    fatal: true,
  })
}
