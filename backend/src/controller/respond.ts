import type { Response } from 'express'
import type { ApiPublicError, ApiSuccess } from '@scalar/shared/api'
import { logger } from '../logger.ts'

export function notFound(res: Response, error: string): void {
  const payload: ApiPublicError = { success: false, data: null, error }
  res.status(404).json(payload)
}

/**
 * Envoie le resultat dans l'enveloppe commune, ou un 404 s'il est `null`.
 * Le detail d'une panne reste cote serveur.
 */
export async function respond<T>(
  res: Response,
  notFoundMessage: string,
  load: () => Promise<T | null>,
): Promise<void> {
  try {
    const data = await load()
    if (data === null) {
      notFound(res, notFoundMessage)
      return
    }
    const payload: ApiSuccess<T> = { success: true, data, error: null }
    res.json(payload)
  } catch (error: unknown) {
    logger.error({ err: error }, 'Lecture du contenu impossible')
    const payload: ApiPublicError = {
      success: false,
      data: null,
      error: 'Le contenu est momentanément indisponible.',
    }
    res.status(500).json(payload)
  }
}
