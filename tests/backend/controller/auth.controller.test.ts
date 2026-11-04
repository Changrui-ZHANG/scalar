import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'

import { buildApp } from '../../../backend/src/app.ts'
import { MESSAGES, SESSION_COOKIE } from '../../../backend/src/constants.ts'
import { InMemoryExerciseRepository } from '../../../backend/src/repository/exercise.repository.ts'
import { InMemoryLessonRepository } from '../../../backend/src/repository/lesson.repository.ts'
import { InMemoryTrackRepository } from '../../../backend/src/repository/track.repository.ts'
import { InMemoryUserRepository } from '../../../backend/src/repository/user.repository.ts'
import { SessionTokenService } from '../../../backend/src/service/session-token.service.ts'

const SECRET = 'secret-de-test-assez-long-pour-hs256-0123456789'
const ADA = { email: 'ada@example.org', password: 'correct horse' }

interface Reply {
  readonly status: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- charge utile polymorphe selon la route
  readonly body: { success: boolean; data: any; error: string | null }
  readonly cookies: readonly string[]
}

let server: Server | null = null

afterEach(
  () =>
    new Promise<void>((resolve, reject) => {
      server?.close((err) => (err ? reject(err) : resolve()))
      server = null
    }),
)

async function start(secureCookie = true) {
  const users = new InMemoryUserRepository()
  const app = buildApp({
    tracks: new InMemoryTrackRepository(),
    lessons: new InMemoryLessonRepository(),
    exercises: new InMemoryExerciseRepository(),
    contentSource: 'mock',
    isDatabaseUp: async () => false,
    executionRateLimit: 1_000,
    trustProxyHops: 0,
    users,
    jwtSecret: SECRET,
    secureCookie,
  })
  server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, () => resolve(s))
  })
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`

  async function call(method: string, path: string, init: { body?: unknown; token?: string } = {}) {
    const headers: Record<string, string> = { 'content-type': 'application/json' }
    if (init.token !== undefined) {
      headers.cookie = `${SESSION_COOKIE}=${init.token}`
    }
    const res = await fetch(`${base}${path}`, {
      method,
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    })
    return {
      status: res.status,
      body: (await res.json()) as Reply['body'],
      cookies: res.headers.getSetCookie(),
    } satisfies Reply
  }
  return { users, call }
}

const tokenOf = (reply: Reply): string => {
  const cookie = reply.cookies.find((c) => c.startsWith(`${SESSION_COOKIE}=`))
  expect(cookie).toBeDefined()
  return cookie!.split(';')[0]!.slice(SESSION_COOKIE.length + 1)
}
const isCleared = (reply: Reply): boolean =>
  reply.cookies.some(
    (c) => c.startsWith(`${SESSION_COOKIE}=;`) && /Expires=Thu, 01 Jan 1970/.test(c),
  )

describe('POST /auth/register', () => {
  it('crée le compte (201), renvoie l’apprenant sans son hash et pose le cookie de session', async () => {
    const { call } = await start()

    const reply = await call('POST', '/auth/register', {
      body: { ...ADA, email: 'Ada@Example.org' },
    })

    expect(reply.status).toBe(201)
    expect(reply.body).toEqual({
      success: true,
      data: { id: expect.any(String), email: ADA.email, createdAt: expect.any(String) },
      error: null,
    })
    expect(JSON.stringify(reply.body)).not.toMatch(/argon2|password/i)
    const [cookie] = reply.cookies
    expect(cookie).toMatch(new RegExp(`^${SESSION_COOKIE}=[\\w-]+\\.[\\w-]+\\.[\\w-]+;`))
    expect(cookie).toContain('Max-Age=900')
    expect(cookie).toContain('Path=/')
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('Secure')
    expect(cookie).toContain('SameSite=Strict')
  })

  it('sans Secure quand la configuration le demande (site local en http)', async () => {
    const { call } = await start(false)

    const [cookie] = (await call('POST', '/auth/register', { body: ADA })).cookies

    expect(cookie).toContain('HttpOnly')
    expect(cookie).not.toContain('Secure')
  })

  it('refuse un email déjà pris, quelle que soit sa casse (409)', async () => {
    const { call } = await start()
    await call('POST', '/auth/register', { body: ADA })

    const reply = await call('POST', '/auth/register', {
      body: { ...ADA, email: 'ADA@example.org' },
    })

    expect(reply.status).toBe(409)
    expect(reply.body).toEqual({ success: false, data: null, error: MESSAGES.emailTaken })
    expect(reply.cookies).toEqual([])
  })

  it.each([
    [{ email: 'ada', password: ADA.password }, MESSAGES.invalidEmail],
    [{ email: ADA.email, password: 'court' }, MESSAGES.invalidPassword],
    [undefined, MESSAGES.invalidEmail],
  ])('refuse une demande invalide (400) : %j', async (body, error) => {
    const { call } = await start()

    const reply = await call('POST', '/auth/register', { body })

    expect(reply.status).toBe(400)
    expect(reply.body.error).toBe(error)
  })
})

describe('POST /auth/login', () => {
  it('connecte et pose un cookie de session', async () => {
    const { call } = await start()
    await call('POST', '/auth/register', { body: ADA })

    const reply = await call('POST', '/auth/login', { body: { ...ADA, email: ' ADA@example.org' } })

    expect(reply.status).toBe(200)
    expect(reply.body.data.email).toBe(ADA.email)
    expect((await call('GET', '/me', { token: tokenOf(reply) })).status).toBe(200)
  })

  it('même réponse (401) pour un mauvais mot de passe et un email inconnu', async () => {
    const { call } = await start()
    await call('POST', '/auth/register', { body: ADA })

    const wrongPassword = await call('POST', '/auth/login', {
      body: { ...ADA, password: 'mauvais mot de passe' },
    })
    const unknownEmail = await call('POST', '/auth/login', {
      body: { ...ADA, email: 'personne@example.org' },
    })

    for (const reply of [wrongPassword, unknownEmail]) {
      expect(reply.status).toBe(401)
      expect(reply.body).toEqual({ success: false, data: null, error: MESSAGES.invalidCredentials })
      expect(reply.cookies).toEqual([])
    }
  })
})

describe('GET /me', () => {
  it('renvoie l’apprenant connecté', async () => {
    const { call } = await start()
    const registered = await call('POST', '/auth/register', { body: ADA })

    const reply = await call('GET', '/me', { token: tokenOf(registered) })

    expect(reply.status).toBe(200)
    expect(reply.body.data).toEqual(registered.body.data)
    expect(reply.cookies).toEqual([])
  })

  it('401 sans cookie, sans toucher aux cookies', async () => {
    const { call } = await start()

    const reply = await call('GET', '/me')

    expect(reply.status).toBe(401)
    expect(reply.body).toEqual({ success: false, data: null, error: MESSAGES.unauthenticated })
    expect(reply.cookies).toEqual([])
  })

  it('401 et cookie effacé pour un jeton expiré', async () => {
    const { users, call } = await start()
    const user = (await users.create({ email: ADA.email, passwordHash: 'x' }))!
    const longAgo = new Date(Date.now() - 16 * 60 * 1000)
    const expired = await new SessionTokenService(SECRET, 900, () => longAgo).sign(user.id, 0)

    const reply = await call('GET', '/me', { token: expired })

    expect(reply.status).toBe(401)
    expect(isCleared(reply)).toBe(true)
  })

  it('401 pour un jeton signé avec un autre secret', async () => {
    const { users, call } = await start()
    const user = (await users.create({ email: ADA.email, passwordHash: 'x' }))!
    const forged = await new SessionTokenService('un-autre-secret-tout-aussi-long-0123456789').sign(
      user.id,
      0,
    )

    expect((await call('GET', '/me', { token: forged })).status).toBe(401)
  })

  it('401, pas 500, pour un jeton bien signé dont le sujet est mal formé', async () => {
    const { call } = await start()
    const malformed = await new SessionTokenService(SECRET).sign('pas-un-uuid', 0)

    expect((await call('GET', '/me', { token: malformed })).status).toBe(401)
  })

  it('401 pour un jeton illisible', async () => {
    const { call } = await start()

    expect((await call('GET', '/me', { token: 'pas-un-jeton' })).status).toBe(401)
  })

  it('renouvelle le cookie d’un jeton passé la moitié de sa vie', async () => {
    const { users, call } = await start()
    const user = (await users.create({ email: ADA.email, passwordHash: 'x' }))!
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
    const aging = await new SessionTokenService(SECRET, 900, () => tenMinutesAgo).sign(user.id, 0)

    const reply = await call('GET', '/me', { token: aging })

    expect(reply.status).toBe(200)
    expect(tokenOf(reply)).not.toBe(aging)
    expect(reply.cookies[0]).toContain('Max-Age=900')
  })
})

describe('POST /auth/logout', () => {
  it('révoque le jeton, même gardé par un client qui ignorerait l’effacement du cookie', async () => {
    const { call } = await start()
    const token = tokenOf(await call('POST', '/auth/register', { body: ADA }))

    const reply = await call('POST', '/auth/logout', { token })

    expect(reply.status).toBe(200)
    expect(reply.body).toEqual({ success: true, data: null, error: null })
    expect(isCleared(reply)).toBe(true)
    expect((await call('GET', '/me', { token })).status).toBe(401)
  })

  it('révoque aussi les sessions ouvertes ailleurs', async () => {
    const { call } = await start()
    const first = tokenOf(await call('POST', '/auth/register', { body: ADA }))
    const second = tokenOf(await call('POST', '/auth/login', { body: ADA }))

    await call('POST', '/auth/logout', { token: second })

    expect((await call('GET', '/me', { token: first })).status).toBe(401)
  })

  it('répond 200 et efface le cookie même sans session valide', async () => {
    const { call } = await start()

    const reply = await call('POST', '/auth/logout', { token: 'pas-un-jeton' })

    expect(reply.status).toBe(200)
    expect(isCleared(reply)).toBe(true)
  })
})

describe('limitation des essais de connexion', () => {
  it('bloque (429) après 10 échecs pour un même email, même avec le bon mot de passe', async () => {
    const { call } = await start()
    await call('POST', '/auth/register', { body: ADA })
    const wrong = { ...ADA, password: 'mauvais mot de passe' }
    for (let i = 0; i < 10; i++) {
      expect((await call('POST', '/auth/login', { body: wrong })).status).toBe(401)
    }

    const blocked = await call('POST', '/auth/login', { body: ADA })

    expect(blocked.status).toBe(429)
    expect(blocked.body).toEqual({
      success: false,
      data: null,
      error: MESSAGES.tooManyAuthAttempts,
    })
    expect(blocked.cookies).toEqual([])
  })

  it('compte les essais par email : un autre compte n’est pas bloqué', async () => {
    const { call } = await start()
    const grace = { email: 'grace@example.org', password: 'correct horse' }
    await call('POST', '/auth/register', { body: grace })
    for (let i = 0; i < 10; i++) {
      await call('POST', '/auth/login', { body: { ...ADA, password: 'mauvais mot de passe' } })
    }

    expect((await call('POST', '/auth/login', { body: grace })).status).toBe(200)
  })

  it('ne compte pas les connexions réussies', async () => {
    const { call } = await start()
    await call('POST', '/auth/register', { body: ADA })
    for (let i = 0; i < 11; i++) {
      expect((await call('POST', '/auth/login', { body: ADA })).status).toBe(200)
    }
  })
})
