import { Router } from 'express'
import type { Request, Response } from 'express'

import { LEARNER_HEADER, MESSAGES } from '../constants.ts'
import { authRateLimit } from '../http/auth-rate-limit.ts'
import { badRequest, fail, notFound, ok } from '../http/envelope.ts'
import { contentUnavailable } from '../http/errors.ts'
import type { SessionSettings } from '../http/require-auth.ts'
import { currentUser, requireAuth } from '../http/require-auth.ts'
import { clearSessionCookie, readSessionToken, setSessionCookie } from '../http/session-cookie.ts'
import type { Session } from '../service/auth.service.ts'
import { parseCredentials } from '../service/auth.service.ts'

export class AuthController {
  private readonly settings: SessionSettings
  private readonly attemptsLimit: number

  constructor(settings: SessionSettings, attemptsLimit: number) {
    this.settings = settings
    this.attemptsLimit = attemptsLimit
  }

  async register(req: Request, res: Response) {
    const parsed = parseCredentials(req.body)
    if (!parsed.ok) {
      badRequest(res, parsed.error)
      return
    }
    try {
      const outcome = await this.settings.auth.register(parsed.credentials, req.get(LEARNER_HEADER))
      switch (outcome.status) {
        case 'email-taken':
          fail(res, 409, MESSAGES.emailTaken)
          return
        case 'learner-already-registered':
          fail(res, 409, MESSAGES.learnerAlreadyRegistered)
          return
        case 'learner-not-found':
          notFound(res, MESSAGES.learnerNotFound)
          return
        default:
          this.open(res, outcome.session)
          res.status(201)
          ok(res, outcome.session.user)
      }
    } catch (error: unknown) {
      contentUnavailable(res, error)
    }
  }

  async login(req: Request, res: Response) {
    const parsed = parseCredentials(req.body)
    if (!parsed.ok) {
      badRequest(res, parsed.error)
      return
    }
    try {
      const session = await this.settings.auth.login(parsed.credentials)
      if (!session) {
        fail(res, 401, MESSAGES.invalidCredentials)
        return
      }
      this.open(res, session)
      ok(res, session.user)
    } catch (error: unknown) {
      contentUnavailable(res, error)
    }
  }

  async logout(req: Request, res: Response) {
    try {
      const token = readSessionToken(req)
      const authentication = token === null ? null : await this.settings.auth.authenticate(token)
      if (authentication) {
        await this.settings.auth.logout(authentication.user.id)
      }
      clearSessionCookie(res, this.settings.secureCookie)
      ok(res, null)
    } catch (error: unknown) {
      contentUnavailable(res, error)
    }
  }

  me(_req: Request, res: Response) {
    ok(res, currentUser(res))
  }

  buildRouter() {
    const router = Router()
    // Une seule instance : inscription et connexion partagent le meme budget d'essais rates.
    const limit = authRateLimit(this.attemptsLimit)
    router.post('/auth/register', limit, this.register.bind(this))
    router.post('/auth/login', limit, this.login.bind(this))
    router.post('/auth/logout', this.logout.bind(this))
    router.get('/auth/me', requireAuth(this.settings), this.me.bind(this))
    return router
  }

  private open(res: Response, session: Session): void {
    const { tokens, secureCookie } = this.settings
    setSessionCookie(res, session.token, tokens.lifetimeSeconds, secureCookie)
  }
}
