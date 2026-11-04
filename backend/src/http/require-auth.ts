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

/** L'apprenant connecte, pose par `requireAuth` ou `optionalAuth`. */
export function currentUser(res: Response): PublicUser {
  const user = res.locals.user as PublicUser | undefined
  if (!user) {
    throw new Error('currentUser appele sur une route sans requireAuth')
  }
  return user
}

/** Pose `res.locals.user` et `res.locals.userId` si la session est valide ; sinon efface le cookie. */
async function resolveSession(
  { auth, tokens, secureCookie }: SessionSettings,
  req: Request,
  res: Response,
): Promise<boolean> {
  const token = readSessionToken(req)
  if (token === null) {
    return false
  }
  const authentication = await auth.authenticate(token)
  if (!authentication) {
    clearSessionCookie(res, secureCookie)
    return false
  }
  if (authentication.renewedToken) {
    setSessionCookie(res, authentication.renewedToken, tokens.lifetimeSeconds, secureCookie)
  }
  res.locals.user = authentication.user
  res.locals.userId = authentication.user.id
  return true
}

/** 401 sans session valide. */
export function requireAuth(settings: SessionSettings): RequestHandler {
  return async (req, res, next) => {
    if (await resolveSession(settings, req, res)) {
      next()
    } else {
      fail(res, 401, MESSAGES.unauthenticated)
    }
  }
}

/** Laisse passer tout le monde ; `res.locals.userId` n'est pose que pour une session valide. */
export function optionalAuth(settings: SessionSettings): RequestHandler {
  return async (req, res, next) => {
    await resolveSession(settings, req, res)
    next()
  }
}
