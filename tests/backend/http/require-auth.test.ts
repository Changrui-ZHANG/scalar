import express from 'express'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { fakeHasher, TEST_JWT_SECRET } from '../auth.fixtures.ts'
import { SESSION_COOKIE } from '../../../backend/src/constants.ts'
import type { SessionSettings } from '../../../backend/src/http/require-auth.ts'
import { currentUser, requireAuth } from '../../../backend/src/http/require-auth.ts'
import { InMemoryUserRepository } from '../../../backend/src/repository/user.repository.ts'
import { AuthService } from '../../../backend/src/service/auth.service.ts'
import { SessionTokenService } from '../../../backend/src/service/session-token.service.ts'

const tokens = new SessionTokenService(TEST_JWT_SECRET)
const settings: SessionSettings = {
  auth: new AuthService(new InMemoryUserRepository(), fakeHasher, tokens),
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
    res.json(currentUser(res))
  })
  app.get('/unprotected', (_req, res) => {
    res.json(currentUser(res))
  })
  server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, () => resolve(s))
  })
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  const outcome = await settings.auth.register({ email: 'ada@example.org', password: 'x' })
  if (outcome.status !== 'registered') {
    throw new Error(outcome.status)
  }
  token = outcome.session.token
  userId = outcome.session.user.id
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
  it('pose le compte connecté pour la suite de la requête', async () => {
    const res = await get('/required', token)

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ id: userId, email: 'ada@example.org' })
  })

  it('401 sans cookie, sans effacer de cookie', async () => {
    const res = await get('/required')

    expect(res.status).toBe(401)
    expect(res.headers.getSetCookie()).toEqual([])
  })

  it('401 avec un cookie invalide, et l’efface', async () => {
    const res = await get('/required', 'pas-un-jeton')

    expect(res.status).toBe(401)
    expect(res.headers.getSetCookie()[0]).toMatch(new RegExp(`^${SESSION_COOKIE}=;`))
  })
})

describe('currentUser', () => {
  it('lève sur une route qui n’est pas protégée : un oubli de requireAuth ne passe pas inaperçu', async () => {
    expect((await get('/unprotected', token)).status).toBe(500)
  })
})
