import { Router } from 'express'
import type { Request, Response } from 'express'

import { MESSAGES } from '../constants.ts'
import { authRateLimit } from '../http/auth-rate-limit.ts'
import { badRequest, fail, ok } from '../http/envelope.ts'
import type { SessionSettings } from '../http/require-auth.ts'
import { currentUser, requireAuth } from '../http/require-auth.ts'
import { clearSessionCookie, readSessionToken, setSessionCookie } from '../http/session-cookie.ts'
import type { Session } from '../service/auth.service.ts'
import { parseCredentials } from '../service/auth.service.ts'

export class AuthController {
  private readonly settings: SessionSettings

  constructor(settings: SessionSettings) {
    this.settings = settings
  }

  async register(req: Request, res: Response) {
    const parsed = parseCredentials(req.body)
    if (!parsed.ok) {
      badRequest(res, parsed.error)
      return
    }
    const session = await this.settings.auth.register(parsed.credentials)
    if (!session) {
      fail(res, 409, MESSAGES.emailTaken)
      return
    }
    this.open(res, session)
    res.status(201)
    ok(res, session.user)
  }

  async login(req: Request, res: Response) {
    const parsed = parseCredentials(req.body)
    if (!parsed.ok) {
      badRequest(res, parsed.error)
      return
    }
    const session = await this.settings.auth.login(parsed.credentials)
    if (!session) {
      fail(res, 401, MESSAGES.invalidCredentials)
      return
    }
    this.open(res, session)
    ok(res, session.user)
  }

  async logout(req: Request, res: Response) {
    const token = readSessionToken(req)
    const authentication = token === null ? null : await this.settings.auth.authenticate(token)
    if (authentication) {
      await this.settings.auth.logout(authentication.user.id)
    }
    clearSessionCookie(res, this.settings.secureCookie)
    ok(res, null)
  }

  me(_req: Request, res: Response) {
    ok(res, currentUser(res))
  }

  buildRouter() {
    const router = Router()
    const limit = authRateLimit()
    router.post('/auth/register', limit, this.register.bind(this))
    router.post('/auth/login', limit, this.login.bind(this))
    router.post('/auth/logout', this.logout.bind(this))
    router.get('/me', requireAuth(this.settings), this.me.bind(this))
    return router
  }

  private open(res: Response, session: Session): void {
    const { tokens, secureCookie } = this.settings
    setSessionCookie(res, session.token, tokens.lifetimeSeconds, secureCookie)
  }
}
