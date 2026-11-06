import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { buildApp } from '../../../backend/src/app.ts'
import { MESSAGES } from '../../../backend/src/constants.ts'
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

  // Une app neuve par test : chaque test part d'un compteur vide.
  beforeEach(async () => {
    const app = buildApp({
      tracks: new InMemoryTrackRepository(),
      lessons: new InMemoryLessonRepository(),
      exercises: new InMemoryExerciseRepository(),
      questionnaire: new InMemoryQuestionnaireRepository(),
      placements: new InMemoryPlacementRepository(),
      users: new InMemoryUserRepository(),
      progress: new InMemoryProgressRepository(),
      certificates: new InMemoryCertificateRepository(),
      contentSource: 'mock',
      executionRateLimit: 2,
      learnerCreationRateLimit: 2,
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
})
