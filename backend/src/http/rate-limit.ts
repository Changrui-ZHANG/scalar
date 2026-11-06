import type { RequestHandler } from 'express'
import { rateLimit } from 'express-rate-limit'

import { MESSAGES, RATE_LIMIT_WINDOW_MS } from '../constants.ts'
import { fail } from './envelope.ts'

// Une seule instance pour toutes les routes qui executent : changer de route ne remet pas le compteur a zero.
export function executionLimiter(limitPerMinute: number): RequestHandler {
  return rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    limit: limitPerMinute,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, res) => {
      fail(res, 429, MESSAGES.tooManyExecutions)
    },
  })
}
