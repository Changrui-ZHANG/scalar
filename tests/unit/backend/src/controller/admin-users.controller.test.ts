import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AUTH_DEPENDENCIES } from '../../../../fixtures/backend/auth.fixtures.ts'
import { subscription } from '../../../../fixtures/backend/premium.fixtures.ts'
import { buildApp } from '../../../../../backend/src/app.ts'
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

const PASSWORD = 'mot de passe solide'

interface Envelope {
  readonly success: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- charge utile polymorphe selon la route
  readonly data: any
  readonly error: string | null
}

describe('admin : utilisateurs et métriques', () => {
  let server: Server
  let base: string
  const users = new InMemoryUserRepository()
  const subscriptions = new InMemorySubscriptionRepository()
  let adminCookie: string
  let learnerCookie: string
  let adaId: string

  const call = async (path: string, cookie?: string) => {
    const res = await fetch(`${base}${path}`, { headers: cookie ? { cookie } : {} })
    return { status: res.status, body: (await res.json()) as Envelope }
  }
  const login = async (email: string) => {
    const res = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: PASSWORD }),
    })
    return res.headers.getSetCookie()[0]!.split(';')[0]!
  }

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

    await users.upsertAdmin({ email: 'admin@example.com', passwordHash: `hash:${PASSWORD}` })
    const ada = (await users.create({
      email: 'ada@example.com',
      passwordHash: `hash:${PASSWORD}`,
    }))!
    adaId = ada.id
    await users.create({ email: 'eve@example.com', passwordHash: `hash:${PASSWORD}` })
    await users.createAnonymous()
    await subscriptions.save(subscription(ada.id))
    adminCookie = await login('admin@example.com')
    learnerCookie = await login('eve@example.com')
  })
  afterAll(
    () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()))
      }),
  )

  it('réserve les deux routes à un admin : 401 sans session, 403 pour un apprenant', async () => {
    for (const path of ['/admin/users', '/admin/metrics']) {
      expect((await call(path)).status, path).toBe(401)
      expect((await call(path, learnerCookie)).status, path).toBe(403)
    }
  })

  it('liste les comptes inscrits avec leur abonnement', async () => {
    const { status, body } = await call('/admin/users', adminCookie)

    expect(status).toBe(200)
    expect(body.data.total).toBe(3)
    expect(body.data.users.find((u: { id: string }) => u.id === adaId)).toEqual({
      id: adaId,
      email: 'ada@example.com',
      role: 'learner',
      createdAt: expect.any(String),
      premium: true,
      subscription: {
        status: 'active',
        plan: 'monthly',
        currentPeriodEnd: '2099-01-01T00:00:00.000Z',
      },
    })
  })

  it('cherche par email et filtre par abonnement', async () => {
    const byEmail = await call('/admin/users?email=EVE', adminCookie)
    const active = await call('/admin/users?subscription=active', adminCookie)
    const none = await call('/admin/users?subscription=none&email=example', adminCookie)

    expect(byEmail.body.data.users.map((u: { email: string }) => u.email)).toEqual([
      'eve@example.com',
    ])
    expect(active.body.data.users.map((u: { email: string }) => u.email)).toEqual([
      'ada@example.com',
    ])
    expect(none.body.data.users.map((u: { email: string }) => u.email).sort()).toEqual([
      'admin@example.com',
      'eve@example.com',
    ])
  })

  it('refuse en 400 un filtre d’abonnement inconnu', async () => {
    expect(await call('/admin/users?subscription=gold', adminCookie)).toMatchObject({
      status: 400,
      body: { error: MESSAGES.invalidSubscriptionFilter },
    })
  })

  it('donne les métriques globales', async () => {
    const { status, body } = await call('/admin/metrics', adminCookie)

    expect(status).toBe(200)
    expect(body.data).toEqual({
      learners: 3,
      registered: 2,
      premium: 1,
      attemptedExercises: 0,
      passedExercises: 0,
      certificates: 0,
      subscriptions: { active: 1, past_due: 0, canceled: 0 },
    })
  })
})
