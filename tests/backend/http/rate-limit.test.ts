import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { AUTH_DEPENDENCIES } from '../auth.fixtures.ts'
import { CountingHasher } from '../counting-hasher.ts'
import { buildApp } from '../../../backend/src/app.ts'
import { MESSAGES } from '../../../backend/src/constants.ts'
import { InMemoryAdminContentRepository } from '../../../backend/src/repository/admin-content.repository.ts'
import { InMemoryCertificateRepository } from '../../../backend/src/repository/certificate.repository.ts'
import { InMemoryExerciseRepository } from '../../../backend/src/repository/exercise.repository.ts'
import { InMemoryLessonRepository } from '../../../backend/src/repository/lesson.repository.ts'
import { InMemoryPlacementRepository } from '../../../backend/src/repository/placement.repository.ts'
import { InMemoryProgressRepository } from '../../../backend/src/repository/progress.repository.ts'
import { InMemoryQuestionnaireRepository } from '../../../backend/src/repository/questionnaire.repository.ts'
import { InMemoryTrackRepository } from '../../../backend/src/repository/track.repository.ts'
import { InMemoryUserRepository } from '../../../backend/src/repository/user.repository.ts'

// Corps vide : refuse en 400 avant tout appel au moteur, mais compte quand meme dans la limite.
const EXECUTING_ROUTES = [
  '/executions',
  '/tracks/javascript/chapters/conditions/exercises/est-pair/verifications',
  '/questionnaire/exercises/6/verifications',
  '/questionnaire/results',
]

describe('limitation de débit', () => {
  let server: Server
  let base: string
  const post = (path: string, ip = '203.0.113.1') =>
    fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
      body: JSON.stringify({ choices: 'invalide' }),
    })

  let hasher: CountingHasher

  // Une app neuve par test : chaque test part d'un compteur vide.
  beforeEach(async () => {
    hasher = new CountingHasher()
    const app = buildApp({
      tracks: new InMemoryTrackRepository(),
      lessons: new InMemoryLessonRepository(),
      exercises: new InMemoryExerciseRepository(),
      questionnaire: new InMemoryQuestionnaireRepository(),
      placements: new InMemoryPlacementRepository(),
      users: new InMemoryUserRepository(),
      progress: new InMemoryProgressRepository(),
      certificates: new InMemoryCertificateRepository(),
      adminContent: new InMemoryAdminContentRepository(),
      contentSource: 'mock',
      executionRateLimit: 2,
      learnerCreationRateLimit: 2,
      ...AUTH_DEPENDENCIES,
      hasher,
      authAttemptsLimit: 2,
      authIpAttemptsLimit: 3,
      authAccountAttemptsLimit: 3,
      isDatabaseUp: async () => false,
    })
    server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, () => resolve(s))
    })
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`
  })
  afterEach(
    () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()))
      }),
  )

  it('au-delà de la limite, répond 429 en JSON avec Retry-After', async () => {
    expect((await post('/executions')).status).toBe(400)
    expect((await post('/executions')).status).toBe(400)

    const refused = await post('/executions')

    expect(refused.status).toBe(429)
    expect(await refused.json()).toEqual({
      success: false,
      data: null,
      error: MESSAGES.tooManyExecutions,
    })
    expect(Number(refused.headers.get('retry-after'))).toBeGreaterThan(0)
    expect(refused.headers.get('ratelimit-policy')).toMatch(/q=2/)
  })

  it('compte toutes les routes qui exécutent ensemble : changer de route ne contourne pas', async () => {
    for (const [i, path] of EXECUTING_ROUTES.entries()) {
      expect((await post(path)).status, path).toBe(i < 2 ? 400 : 429)
    }
  })

  it.each(['/admin/exercises/1/solution-check', '/admin/exercises/1/verifications'])(
    'compte aussi le back-office : %s',
    async (path) => {
      expect((await post(path)).status).toBe(401)
      expect((await post(path)).status).toBe(401)
      expect((await post(path)).status).toBe(429)
    },
  )

  it('ne limite jamais les lectures', async () => {
    await post('/executions')
    await post('/executions')

    for (let i = 0; i < 5; i++) {
      expect((await fetch(`${base}/tracks`)).status).toBe(200)
    }
  })

  it('limite la création d’apprenants avec son propre compteur', async () => {
    expect((await post('/learners')).status).toBe(201)
    expect((await post('/learners')).status).toBe(201)

    const refused = await post('/learners')

    expect(refused.status).toBe(429)
    expect(((await refused.json()) as { error: string }).error).toBe(MESSAGES.tooManyLearners)
    expect((await post('/executions')).status).toBe(400)
  })

  it('donne à chaque adresse IP son propre compteur, derrière le proxy', async () => {
    await post('/executions', '203.0.113.1')
    await post('/executions', '203.0.113.1')

    expect((await post('/executions', '203.0.113.1')).status).toBe(429)
    expect((await post('/executions', '198.51.100.7')).status).toBe(400)
  })

  describe('connexion et inscription', () => {
    const login = (email: string, password: string, ip = '203.0.113.1') =>
      fetch(`${base}/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
        body: JSON.stringify({ email, password }),
      })
    const register = (email: string) =>
      fetch(`${base}/auth/register`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.1' },
        body: JSON.stringify({ email, password: 'correct horse' }),
      })

    it('bloque en 429 les essais ratés en rafale sur un même email', async () => {
      await register('ada@example.org')
      expect((await login('ada@example.org', 'mauvais 1')).status).toBe(401)
      expect((await login('ada@example.org', 'mauvais 2')).status).toBe(401)

      const refused = await login('ada@example.org', 'correct horse')

      expect(refused.status).toBe(429)
      expect(((await refused.json()) as { error: string }).error).toBe(MESSAGES.tooManyAuthAttempts)
      expect((await login('eve@example.org', 'mauvais 1')).status).toBe(401)
    })

    const IP_LIMIT = 3
    const ACCOUNT_LIMIT = 3
    // Largement plus que les limites : l'attaque doit vraiment buter dessus.
    const ATTEMPTS = 10

    it('limite par IP : 10 emails essayés, seuls 3 mots de passe vérifiés, le reste en 429', async () => {
      const statuses: number[] = []

      for (let i = 0; i < ATTEMPTS; i++) {
        statuses.push((await login(`victime-${i}@example.org`, 'motdepasse')).status)
      }

      expect(statuses.length).toBeGreaterThan(IP_LIMIT)
      expect(hasher.verifications).toBe(IP_LIMIT)
      expect(statuses.filter((s) => s === 401)).toHaveLength(IP_LIMIT)
      expect(statuses.filter((s) => s === 429)).toHaveLength(ATTEMPTS - IP_LIMIT)
      // Une autre IP n'est pas touchée : on bloque l'attaquant, pas tout le monde.
      expect((await login('victime-0@example.org', 'motdepasse', '198.51.100.7')).status).toBe(401)
      expect(hasher.verifications).toBe(IP_LIMIT + 1)
    })

    it('limite par compte : 10 IP sur le même email, seuls 3 mots de passe vérifiés, le reste en 429', async () => {
      const statuses: number[] = []

      for (let i = 0; i < ATTEMPTS; i++) {
        statuses.push(
          (await login('admin@example.org', 'motdepasse', `198.51.100.${i + 1}`)).status,
        )
      }

      expect(statuses.length).toBeGreaterThan(ACCOUNT_LIMIT)
      expect(hasher.verifications).toBe(ACCOUNT_LIMIT)
      expect(statuses.filter((s) => s === 401)).toHaveLength(ACCOUNT_LIMIT)
      expect(statuses.filter((s) => s === 429)).toHaveLength(ATTEMPTS - ACCOUNT_LIMIT)
      // Un autre compte, depuis une IP neuve, n'est pas touché.
      expect((await login('eve@example.org', 'motdepasse', '198.51.100.200')).status).toBe(401)
      expect(hasher.verifications).toBe(ACCOUNT_LIMIT + 1)
    })

    it('ne compte pas les essais réussis', async () => {
      await register('ada@example.org')

      for (let i = 0; i < 4; i++) {
        expect((await login('ada@example.org', 'correct horse')).status).toBe(200)
      }
    })
  })
})
