import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { buildApp } from '../../../backend/src/app.ts'
import { MESSAGES } from '../../../backend/src/constants.ts'
import { InMemoryExerciseRepository } from '../../../backend/src/repository/exercise.repository.ts'
import { InMemoryLessonRepository } from '../../../backend/src/repository/lesson.repository.ts'
import { InMemoryTrackRepository } from '../../../backend/src/repository/track.repository.ts'
import { InMemoryUserRepository } from '../../../backend/src/repository/user.repository.ts'

const LIMIT = 2
const VERIFICATIONS = '/tracks/javascript/chapters/conditions/exercises/est-pair/verifications'
// Corps refusé en 400 avant tout appel au moteur : aucun Piston n'est nécessaire.
const INVALID_SUBMISSION = JSON.stringify({ code: 42 })

const servers: Server[] = []

async function start(trustProxyHops = 0): Promise<string> {
  const app = buildApp({
    tracks: new InMemoryTrackRepository(),
    lessons: new InMemoryLessonRepository(),
    exercises: new InMemoryExerciseRepository(),
    contentSource: 'mock',
    isDatabaseUp: async () => false,
    executionRateLimit: LIMIT,
    trustProxyHops,
    users: new InMemoryUserRepository(),
    jwtSecret: 'secret-de-test-assez-long-pour-hs256-0123456789',
    secureCookie: true,
  })
  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, () => resolve(s))
  })
  servers.push(server)
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`
}

async function post(url: string, headers: Record<string, string> = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: INVALID_SUBMISSION,
  })
  return { status: res.status, headers: res.headers, body: (await res.json()) as unknown }
}

afterEach(async () => {
  vi.restoreAllMocks()
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((err) => (err ? reject(err) : resolve()))
        }),
    ),
  )
})

describe('limitation de débit des exécutions', () => {
  it('laisse passer les requêtes sous la limite, sans changer la réponse', async () => {
    const base = await start()

    for (let i = 0; i < LIMIT; i++) {
      const { status, body } = await post(`${base}/executions`)
      expect(status).toBe(400)
      expect(body).toMatchObject({ success: false, data: null })
      expect(body).not.toEqual({ success: false, data: null, error: MESSAGES.tooManyExecutions })
    }
  })

  it('répond 429 avec l’enveloppe d’erreur commune au-delà de la limite', async () => {
    const base = await start()
    for (let i = 0; i < LIMIT; i++) await post(`${base}/executions`)

    const { status, headers, body } = await post(`${base}/executions`)

    expect(status).toBe(429)
    expect(body).toEqual({ success: false, data: null, error: MESSAGES.tooManyExecutions })
    expect(Number(headers.get('retry-after'))).toBeGreaterThan(0)
  })

  it('partage le budget entre exécutions et vérifications', async () => {
    const base = await start()
    await post(`${base}/executions`)
    expect((await post(`${base}${VERIFICATIONS}`)).status).toBe(400)

    expect((await post(`${base}${VERIFICATIONS}`)).status).toBe(429)
    expect((await post(`${base}/executions`)).status).toBe(429)
  })

  it('ne limite pas les autres routes', async () => {
    const base = await start()
    for (let i = 0; i <= LIMIT; i++) await post(`${base}/executions`)

    for (let i = 0; i <= LIMIT; i++) {
      expect((await fetch(`${base}/tracks`)).status).toBe(200)
      expect((await fetch(`${base}/health`)).status).toBe(200)
      expect(
        (await fetch(`${base}/tracks/javascript/chapters/conditions/exercises/est-pair`)).status,
      ).toBe(200)
    }
  })

  it('donne à chaque application son propre compteur', async () => {
    const first = await start()
    for (let i = 0; i <= LIMIT; i++) await post(`${first}/executions`)

    const second = await start()
    expect((await post(`${second}/executions`)).status).toBe(400)
  })

  it('derrière un proxy, compte chaque client d’après X-Forwarded-For', async () => {
    const base = await start(1)
    for (let i = 0; i <= LIMIT; i++) {
      await post(`${base}/executions`, { 'x-forwarded-for': '203.0.113.1' })
    }

    expect((await post(`${base}/executions`, { 'x-forwarded-for': '203.0.113.1' })).status).toBe(
      429,
    )
    expect((await post(`${base}/executions`, { 'x-forwarded-for': '203.0.113.2' })).status).toBe(
      400,
    )
  })

  it('sans proxy déclaré, un X-Forwarded-For forgé ne contourne pas la limite', async () => {
    // express-rate-limit signale l'en-tête inattendu sur la console : attendu ici.
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const base = await start(0)
    for (let i = 0; i <= LIMIT; i++) await post(`${base}/executions`)

    expect((await post(`${base}/executions`, { 'x-forwarded-for': '203.0.113.9' })).status).toBe(
      429,
    )
  })
})
