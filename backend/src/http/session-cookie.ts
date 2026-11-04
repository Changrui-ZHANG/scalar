import type { CookieOptions, Request, Response } from 'express'
import { parseCookie } from 'cookie'

import { SESSION_COOKIE } from '../constants.ts'

const options = (secure: boolean): CookieOptions => ({
  httpOnly: true,
  secure,
  sameSite: 'strict',
  path: '/',
})

export function readSessionToken(req: Request): string | null {
  return parseCookie(req.headers.cookie ?? '')[SESSION_COOKIE] ?? null
}

export function setSessionCookie(
  res: Response,
  token: string,
  lifetimeSeconds: number,
  secure: boolean,
): void {
  res.cookie(SESSION_COOKIE, token, { ...options(secure), maxAge: lifetimeSeconds * 1000 })
}

// Le navigateur ne supprime le cookie que si ses attributs (path...) sont les memes qu'a sa creation.
export function clearSessionCookie(res: Response, secure: boolean): void {
  res.clearCookie(SESSION_COOKIE, options(secure))
}
