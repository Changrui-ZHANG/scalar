import type { Request, RequestHandler } from 'express'
import { ipKeyGenerator, rateLimit } from 'express-rate-limit'

import { AUTH_ATTEMPTS_LIMIT, AUTH_ATTEMPTS_WINDOW_MS, MESSAGES } from '../constants.ts'
import { fail } from './envelope.ts'

const emailOf = (req: Request): string => {
  const email = (req.body as { email?: unknown } | undefined)?.email
  return typeof email === 'string' ? email.trim().toLowerCase() : ''
}

/** Essais ratés de connexion ou d'inscription, par adresse IP et par email ; un succès ne compte pas. */
export function authRateLimit(): RequestHandler {
  return rateLimit({
    windowMs: AUTH_ATTEMPTS_WINDOW_MS,
    limit: AUTH_ATTEMPTS_LIMIT,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    // ipKeyGenerator regroupe une adresse IPv6 avec son sous-reseau : sinon chaque adresse du /64 aurait son propre budget.
    keyGenerator: (req) => `${ipKeyGenerator(req.ip ?? '')}|${emailOf(req)}`,
    handler: (_req, res) => {
      fail(res, 429, MESSAGES.tooManyAuthAttempts)
    },
  })
}
