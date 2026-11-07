import type { Request, RequestHandler, Response } from 'express'

import { MESSAGES } from '../constants.ts'
import type { AuthService, PublicUser } from '../service/auth.service.ts'
import type { SessionTokenService } from '../service/session-token.service.ts'
import { fail } from './envelope.ts'
import { clearSessionCookie, readSessionToken, setSessionCookie } from './session-cookie.ts'

export interface SessionSettings {
  readonly auth: AuthService
  readonly tokens: SessionTokenService
  readonly secureCookie: boolean
}

/** Le compte connecte, pose par `requireAuth`. */
export function currentUser(res: Response): PublicUser {
  const user = res.locals.user as PublicUser | undefined
  if (!user) {
    throw new Error('currentUser appele sur une route sans requireAuth')
  }
  return user
}

/** Le compte de la session, ou null ; renouvelle un jeton vieillissant et efface un cookie invalide. */
export async function resolveSession(
  { auth, tokens, secureCookie }: SessionSettings,
  req: Request,
  res: Response,
): Promise<PublicUser | null> {
  const token = readSessionToken(req)
  if (token === null) {
    return null
  }
  const authentication = await auth.authenticate(token)
  if (!authentication) {
    clearSessionCookie(res, secureCookie)
    return null
  }
  if (authentication.renewedToken) {
    setSessionCookie(res, authentication.renewedToken, tokens.lifetimeSeconds, secureCookie)
  }
  return authentication.user
}

/** 401 sans session valide. */
export function requireAuth(settings: SessionSettings): RequestHandler {
  return async (req, res, next) => {
    try {
      const user = await resolveSession(settings, req, res)
      if (!user) {
        fail(res, 401, MESSAGES.unauthenticated)
        return
      }
      res.locals.user = user
      next()
    } catch (error: unknown) {
      next(error)
    }
  }
}
