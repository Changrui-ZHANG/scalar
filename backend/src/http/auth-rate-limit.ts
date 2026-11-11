import type { Request, RequestHandler } from 'express'
import { ipKeyGenerator, rateLimit } from 'express-rate-limit'

import { AUTH_ATTEMPTS_WINDOW_MS, MESSAGES } from '../constants.ts'
import { fail } from './envelope.ts'

export interface AuthAttemptsLimits {
  /** Une IP sur un email. */
  readonly pair: number
  /** Une IP, tous emails confondus : contre le password spraying. */
  readonly ip: number
  /** Un email, toutes IP confondues : contre une attaque distribuee sur un compte. */
  readonly account: number
}

const emailOf = (req: Request): string => {
  const email = (req.body as { email?: unknown } | undefined)?.email
  return typeof email === 'string' ? email.trim().toLowerCase() : ''
}

// ipKeyGenerator regroupe une adresse IPv6 avec son sous-reseau : sinon chaque adresse du /64 aurait son propre budget.
const ipOf = (req: Request): string => ipKeyGenerator(req.ip ?? '')

function failedAttemptsLimiter(
  limit: number,
  keyGenerator: (req: Request) => string,
  skip?: (req: Request) => boolean,
): RequestHandler {
  return rateLimit({
    windowMs: AUTH_ATTEMPTS_WINDOW_MS,
    limit,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator,
    ...(skip && { skip }),
    handler: (_req, res) => {
      fail(res, 429, MESSAGES.tooManyAuthAttempts)
    },
  })
}

/** Essais rates de connexion ou d'inscription ; un succes ne compte pas. Les trois compteurs s'appliquent ensemble. */
export function authRateLimit(limits: AuthAttemptsLimits): RequestHandler[] {
  return [
    failedAttemptsLimiter(limits.pair, (req) => `${ipOf(req)}|${emailOf(req)}`),
    failedAttemptsLimiter(limits.ip, ipOf),
    // Sans email, la requete est refusee avant tout essai de mot de passe : pas de compteur commun a ces requetes.
    failedAttemptsLimiter(limits.account, emailOf, (req) => emailOf(req) === ''),
  ]
}
