import type { ErrorRequestHandler, RequestHandler, Response } from 'express'

import { MESSAGES } from '../constants.ts'
import { logger } from '../logger.ts'
import { fail } from './envelope.ts'

export function contentUnavailable(res: Response, error: unknown): void {
  logger.error({ err: error }, 'Lecture du contenu impossible')
  fail(res, 500, MESSAGES.contentUnavailable)
}

export function engineUnavailable(res: Response, error: unknown): void {
  logger.error({ err: error }, 'Échec de l’appel au moteur d’exécution')
  fail(res, 503, MESSAGES.engineUnavailable)
}

export const routeNotFound: RequestHandler = (_req, res) => {
  fail(res, 404, MESSAGES.routeNotFound)
}

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  const status = (error as { status?: unknown } | null)?.status
  if (typeof status === 'number' && status >= 400 && status < 500) {
    fail(res, status, MESSAGES.invalidRequest)
    return
  }
  logger.error({ err: error }, 'Erreur non gérée')
  fail(res, 500, MESSAGES.internalError)
}
