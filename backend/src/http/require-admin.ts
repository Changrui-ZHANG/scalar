import type { RequestHandler } from 'express'

import { MESSAGES } from '../constants.ts'
import { fail } from './envelope.ts'
import type { SessionSettings } from './require-auth.ts'
import { resolveSession } from './require-auth.ts'

/** 401 sans session valide, 403 pour un compte qui n'est pas admin. */
export function requireAdmin(settings: SessionSettings): RequestHandler {
  return async (req, res, next) => {
    try {
      const user = await resolveSession(settings, req, res)
      if (!user) {
        fail(res, 401, MESSAGES.unauthenticated)
        return
      }
      if (user.role !== 'admin') {
        fail(res, 403, MESSAGES.forbidden)
        return
      }
      res.locals.user = user
      next()
    } catch (error: unknown) {
      next(error)
    }
  }
}
