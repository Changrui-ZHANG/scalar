import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { AUTH_DEPENDENCIES } from '../../../../fixtures/backend/auth.fixtures.ts'
import { chapter, exercise, track } from '../../../../fixtures/backend/content.fixtures.ts'
import { PAST, subscription } from '../../../../fixtures/backend/premium.fixtures.ts'
import { buildApp } from '../../../../../backend/src/app.ts'
import { config } from '../../../../../backend/src/config.ts'
import { MESSAGES } from '../../../../../backend/src/constants.ts'
import { InMemoryAdminContentRepository } from '../../../../../backend/src/repository/admin-content.repository.ts'
import { InMemoryCertificateRepository } from '../../../../../backend/src/repository/certificate.repository.ts'
import { InMemoryExerciseRepository } from '../../../../../backend/src/repository/exercise.repository.ts'
import { InMemoryLessonRepository } from '../../../../../backend/src/repository/lesson.repository.ts'
import { InMemoryPlacementRepository } from '../../../../../backend/src/repository/placement.repository.ts'
import { InMemoryProgressRepository } from '../../../../../backend/src/repository/progress.repository.ts'
import { InMemoryQuestionnaireRepository } from '../../../../../backend/src/repository/questionnaire.repository.ts'
import { InMemorySubscriptionRepository } from '../../../../../backend/src/repository/subscription.repository.ts'
import { InMemoryTrackRepository } from '../../../../../backend/src/repository/track.repository.ts'
import { InMemoryUserRepository } from '../../../../../backend/src/repository/user.repository.ts'

// Chapitres 2 et 3 du parcours JavaScript : le premier gratuit, le second Premium.
const FREE_LESSON = '/tracks/javascript/chapters/variables/lessons/variables-et-types-primitifs'
const FREE_EXERCISE = '/tracks/javascript/chapters/variables/exercises/echanger-valeurs'
const LOCKED_LESSON = '/tracks/javascript/chapters/conditions/lessons/conditions'
const LOCKED_EXERCISE = '/tracks/javascript/chapters/conditions/exercises/est-pair'
const PASSWORD = 'mot de passe solide'
const realFetch = globalThis.fetch

interface Envelope {
  readonly success: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- charge utile polymorphe selon la route
  readonly data: any
  readonly error: string | null
}

describe('verrou Premium sur le contenu', () => {
  let server: Server
  let base: string
  const users = new InMemoryUserRepository()
  const subscriptions = new InMemorySubscriptionRepository()
  let counter = 0

  const call = async (
    method: 'GET' | 'POST',
    path: string,
    options: { body?: unknown; cookie?: string; learnerId?: string } = {},
  ) => {
    const res = await realFetch(`${base}${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        ...(options.cookie === undefined ? {} : { cookie: options.cookie }),
        ...(options.learnerId === undefined ? {} : { 'x-learner-id': options.learnerId }),
      },
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    })
    const cookie = res.headers.getSetCookie()[0]?.split(';')[0]
    return { status: res.status, body: (await res.json()) as Envelope, cookie }
  }
  const register = async () => {
    counter += 1
    const { body, cookie } = await call('POST', '/auth/register', {
      body: { email: `premium-${counter}@example.com`, password: PASSWORD },
    })
    return { id: body.data.id as string, cookie: cookie! }
  }
  const subscriber = async (extra = {}) => {
    const account = await register()
    await subscriptions.save(subscription(account.id, extra))
    return account
  }
  const createLearner = async (): Promise<string> =>
    (await call('POST', '/learners')).body.data.id as string

  beforeAll(async () => {
    const app = buildApp({
      tracks: new InMemoryTrackRepository(),
      lessons: new InMemoryLessonRepository(),
      exercises: new InMemoryExerciseRepository(),
      questionnaire: new InMemoryQuestionnaireRepository(),
      placements: new InMemoryPlacementRepository(),
      users,
      progress: new InMemoryProgressRepository(),
      certificates: new InMemoryCertificateRepository(),
      adminContent: new InMemoryAdminContentRepository(),
      subscriptions,
      freeChapters: 2,
      contentSource: 'mock',
      executionRateLimit: 1_000,
      learnerCreationRateLimit: 1_000,
      ...AUTH_DEPENDENCIES,
      isDatabaseUp: async () => false,
    })
    server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, () => resolve(s))
    })
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  afterAll(
    () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()))
      }),
  )

  it('signale dans le fil les chapitres gratuits, les mêmes pour tout le monde', async () => {
    const { status, body } = await call('GET', '/tracks/javascript')

    expect(status).toBe(200)
    expect(body.data.chapters.map((c: { number: number; free: boolean }) => c.free)).toEqual(
      body.data.chapters.map((c: { number: number }) => c.number <= 2),
    )
  })

  it('sert sans compte les leçons et exercices des chapitres gratuits', async () => {
    expect((await call('GET', FREE_LESSON)).status).toBe(200)
    expect((await call('GET', FREE_EXERCISE)).status).toBe(200)
  })

  it('refuse en 403 les leçons et exercices au-delà du seuil, sans compte ni Premium', async () => {
    const learnerId = await createLearner()
    const { cookie } = await register()

    for (const options of [{}, { learnerId }, { cookie }]) {
      for (const path of [LOCKED_LESSON, LOCKED_EXERCISE]) {
        expect(await call('GET', path, options), path).toMatchObject({
          status: 403,
          body: { success: false, data: null, error: MESSAGES.premiumRequired },
        })
      }
    }
  })

  it('refuse en 403 la vérification d’un exercice verrouillé, sans appeler le moteur', async () => {
    const engine = vi.spyOn(globalThis, 'fetch')
    const learnerId = await createLearner()

    const res = await call('POST', `${LOCKED_EXERCISE}/verifications`, {
      body: { code: 'function isEven(n) { return n % 2 === 0 }' },
      learnerId,
    })

    expect(res.status).toBe(403)
    expect(res.body.error).toBe(MESSAGES.premiumRequired)
    expect(engine).not.toHaveBeenCalled()
  })

  it('refuse un abonnement expiré, en échec de paiement ou résilié', async () => {
    for (const extra of [
      { currentPeriodEnd: PAST },
      { status: 'past_due' },
      { status: 'canceled' },
    ]) {
      const { cookie } = await subscriber(extra)
      expect((await call('GET', LOCKED_LESSON, { cookie })).status, JSON.stringify(extra)).toBe(403)
    }
  })

  it('ouvre tout le contenu à un abonné Premium actif', async () => {
    const { cookie } = await subscriber()

    expect((await call('GET', LOCKED_LESSON, { cookie })).status).toBe(200)
    expect((await call('GET', LOCKED_EXERCISE, { cookie })).status).toBe(200)
  })

  it('laisse passer la vérification d’un abonné jusqu’au moteur', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((url, init) =>
      String(url).startsWith(config.PISTON_URL)
        ? Promise.reject(new Error('moteur coupé'))
        : realFetch(url, init),
    )
    const { cookie } = await subscriber()

    const res = await call('POST', `${LOCKED_EXERCISE}/verifications`, {
      body: { code: 'function isEven(n) { return n % 2 === 0 }' },
      cookie,
    })

    expect(res.status).toBe(503)
    expect(res.body.error).toBe(MESSAGES.engineUnavailable)
  })

  it('ouvre tout le contenu à un admin, sans abonnement', async () => {
    await users.upsertAdmin({ email: 'admin@example.com', passwordHash: `hash:${PASSWORD}` })
    const { cookie } = await call('POST', '/auth/login', {
      body: { email: 'admin@example.com', password: PASSWORD },
    })

    expect((await call('GET', LOCKED_LESSON, { cookie })).status).toBe(200)
  })

  it('répond toujours 404 hors hiérarchie, avant tout verrou', async () => {
    expect((await call('GET', '/tracks/javascript/chapters/inconnu/lessons/x')).status).toBe(404)
    expect(
      (await call('GET', '/tracks/python/chapters/conditions/lessons/conditions')).status,
    ).toBe(404)
    expect((await call('GET', '/tracks/javascript/chapters/modules/lessons/modules')).status).toBe(
      404,
    )
  })

  it('réserve le certificat au Premium, avant de regarder la progression', async () => {
    const certificate = { track: 'javascript', holderName: 'Ada' }
    const learnerId = await createLearner()
    const account = await register()
    const premium = await subscriber()

    expect(
      (await call('POST', `/learners/${learnerId}/certificates`, { body: certificate })).body.error,
    ).toBe(MESSAGES.premiumRequired)
    expect(
      (
        await call('POST', `/learners/${account.id}/certificates`, {
          body: certificate,
          cookie: account.cookie,
        })
      ).body.error,
    ).toBe(MESSAGES.premiumRequired)
    expect(
      await call('POST', `/learners/${premium.id}/certificates`, {
        body: certificate,
        cookie: premium.cookie,
      }),
    ).toMatchObject({ status: 403, body: { error: MESSAGES.trackNotCompleted } })
    expect(
      await call('POST', `/learners/${premium.id}/certificates`, {
        body: { ...certificate, track: 'python' },
        cookie: premium.cookie,
      }),
    ).toMatchObject({ status: 404, body: { error: MESSAGES.trackNotFound } })
  })
})

describe('certificat d’une formation entièrement gratuite', () => {
  let server: Server
  let base: string
  const progress = new InMemoryProgressRepository()

  beforeAll(async () => {
    // « mini » tient dans le seuil gratuit (2 chapitres) ; « longue » le dépasse d'un chapitre.
    const tracks = new InMemoryTrackRepository(
      [track(1, 'mini', 1), track(2, 'longue', 2)],
      [
        chapter(11, 1, 'un', 'beginner', 1),
        chapter(12, 1, 'deux', 'beginner', 2),
        chapter(21, 2, 'un', 'beginner', 1),
        chapter(22, 2, 'deux', 'beginner', 2),
        chapter(23, 2, 'trois', 'beginner', 3),
      ],
    )
    const exercises = new InMemoryExerciseRepository(
      [exercise(1, 11, 'e1', 1), exercise(2, 12, 'e2', 1), exercise(3, 21, 'e3', 1)],
      [],
    )
    const app = buildApp({
      tracks,
      lessons: new InMemoryLessonRepository([]),
      exercises,
      questionnaire: new InMemoryQuestionnaireRepository(),
      placements: new InMemoryPlacementRepository(),
      users: new InMemoryUserRepository(),
      progress,
      certificates: new InMemoryCertificateRepository(),
      adminContent: new InMemoryAdminContentRepository(),
      subscriptions: new InMemorySubscriptionRepository(),
      freeChapters: 2,
      contentSource: 'mock',
      executionRateLimit: 1_000,
      learnerCreationRateLimit: 1_000,
      ...AUTH_DEPENDENCIES,
      isDatabaseUp: async () => false,
    })
    server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, () => resolve(s))
    })
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`
  })
  afterAll(
    () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()))
      }),
  )

  const ask = async (learnerId: string, trackSlug: string) => {
    const res = await realFetch(`${base}/learners/${learnerId}/certificates`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ track: trackSlug, holderName: 'Ada' }),
    })
    return { status: res.status, error: ((await res.json()) as Envelope).error }
  }

  it('délivre sans Premium le certificat d’une formation dont tous les chapitres sont gratuits', async () => {
    const id = (
      (await (await realFetch(`${base}/learners`, { method: 'POST' })).json()) as Envelope
    ).data.id as string

    expect(await ask(id, 'mini')).toEqual({ status: 403, error: MESSAGES.trackNotCompleted })
    for (const exerciseId of [1, 2]) {
      await progress.recordAttempt(id, exerciseId, true, new Date())
    }
    expect((await ask(id, 'mini')).status).toBe(201)
  })

  it('garde le certificat Premium dès qu’un chapitre dépasse le seuil', async () => {
    const id = (
      (await (await realFetch(`${base}/learners`, { method: 'POST' })).json()) as Envelope
    ).data.id as string
    await progress.recordAttempt(id, 3, true, new Date())

    expect(await ask(id, 'longue')).toEqual({ status: 403, error: MESSAGES.premiumRequired })
  })
})
