import type { RequestHandler } from 'express'
import { rateLimit } from 'express-rate-limit'

import { EXECUTION_RATE_WINDOW_MS, MESSAGES } from '../constants.ts'
import { fail } from './envelope.ts'

export function executionRateLimiter(limit: number): RequestHandler {
  return rateLimit({
    windowMs: EXECUTION_RATE_WINDOW_MS,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, res) => {
      fail(res, 429, MESSAGES.tooManyExecutions)
    },
  })
}
