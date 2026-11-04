import express from 'express'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { SESSION_COOKIE } from '../../../backend/src/constants.ts'
import type { SessionSettings } from '../../../backend/src/http/require-auth.ts'
import { currentUser, optionalAuth, requireAuth } from '../../../backend/src/http/require-auth.ts'
import { InMemoryUserRepository } from '../../../backend/src/repository/user.repository.ts'
import { AuthService } from '../../../backend/src/service/auth.service.ts'
import { SessionTokenService } from '../../../backend/src/service/session-token.service.ts'

const SECRET = 'secret-de-test-assez-long-pour-hs256-0123456789'
const tokens = new SessionTokenService(SECRET)
const users = new InMemoryUserRepository()
const hasher = { hash: async (p: string) => p, verify: async (h: string, p: string) => h === p }
const settings: SessionSettings = {
  auth: new AuthService(users, hasher, tokens),
  tokens,
  secureCookie: true,
}

let server: Server
let base: string
let token: string
let userId: string

beforeAll(async () => {
  const app = express()
  app.get('/required', requireAuth(settings), (_req, res) => {
    res.json({ userId: res.locals.userId, email: currentUser(res).email })
  })
  app.get('/optional', optionalAuth(settings), (_req, res) => {
    res.json({ userId: res.locals.userId ?? null })
  })
  app.get('/unprotected', (_req, res) => {
    res.json({ email: currentUser(res).email })
  })
  server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, () => resolve(s))
  })
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  const session = (await settings.auth.register({ email: 'ada@example.org', password: 'x' }))!
  token = session.token
  userId = session.user.id
})

afterAll(
  () =>
    new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()))
    }),
)

const get = (path: string, cookie?: string) =>
  fetch(`${base}${path}`, { headers: cookie ? { cookie: `${SESSION_COOKIE}=${cookie}` } : {} })

describe('requireAuth', () => {
  it('pose l’id et l’apprenant pour la suite de la requête', async () => {
    const res = await get('/required', token)

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ userId, email: 'ada@example.org' })
  })

  it('401 sans session valide', async () => {
    expect((await get('/required')).status).toBe(401)
    expect((await get('/required', 'pas-un-jeton')).status).toBe(401)
  })
})

describe('optionalAuth', () => {
  it('pose l’id pour une session valide', async () => {
    expect(await (await get('/optional', token)).json()).toEqual({ userId })
  })

  it('laisse passer sans session, et efface un cookie invalide', async () => {
    const anonymous = await get('/optional')
    const invalid = await get('/optional', 'pas-un-jeton')

    expect(await anonymous.json()).toEqual({ userId: null })
    expect(anonymous.headers.getSetCookie()).toEqual([])
    expect(await invalid.json()).toEqual({ userId: null })
    expect(invalid.headers.getSetCookie()[0]).toMatch(new RegExp(`^${SESSION_COOKIE}=;`))
  })
})

describe('currentUser', () => {
  it('lève sur une route qui n’est pas protégée : un oubli de requireAuth ne passe pas inaperçu', async () => {
    expect((await get('/unprotected', token)).status).toBe(500)
  })
})
