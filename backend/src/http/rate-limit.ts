import type { RequestHandler } from 'express'
import { rateLimit } from 'express-rate-limit'

import { RATE_LIMIT_WINDOW_MS } from '../constants.ts'
import { fail } from './envelope.ts'

// Une instance = un compteur : la monter sur plusieurs routes les fait compter ensemble.
export function perMinuteLimiter(limitPerMinute: number, message: string): RequestHandler {
  return rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    limit: limitPerMinute,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, res) => {
      fail(res, 429, message)
    },
  })
}
