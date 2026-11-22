import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AUTH_DEPENDENCIES } from '../../../../fixtures/backend/auth.fixtures.ts'
import {
  FakeBillingGateway,
  VALID_SIGNATURE,
  webhookPayload,
} from '../../../../fixtures/backend/fake-billing-gateway.ts'
import { PAST, subscription } from '../../../../fixtures/backend/premium.fixtures.ts'
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
import type { BillingGateway } from '../../../../../backend/src/service/billing-gateway.ts'

const LOCKED_LESSON = '/tracks/javascript/chapters/conditions/lessons/conditions'
const PASSWORD = 'mot de passe solide'

interface Envelope {
  readonly success: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- charge utile polymorphe selon la route
  readonly data: any
  readonly error: string | null
}

async function start(gateway: BillingGateway | null) {
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
    subscriptions: new InMemorySubscriptionRepository(),
    freeChapters: 2,
    billingGateway: gateway,
    contentSource: 'mock',
    executionRateLimit: 1_000,
    learnerCreationRateLimit: 1_000,
    ...AUTH_DEPENDENCIES,
    isDatabaseUp: async () => false,
  })
  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, () => resolve(s))
  })
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`
  let counter = 0

  const call = async (
    method: 'GET' | 'POST',
    path: string,
    options: { body?: unknown; cookie?: string } = {},
  ) => {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        ...(options.cookie === undefined ? {} : { cookie: options.cookie }),
      },
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    })
    const cookie = res.headers.getSetCookie()[0]?.split(';')[0]
    return { status: res.status, body: (await res.json()) as Envelope, cookie }
  }
  // Le corps exact, tel que Stripe l'a signe : il ne doit pas passer par express.json.
  const webhook = async (payload: string, signature: string | null = VALID_SIGNATURE) => {
    const res = await fetch(`${base}/billing/webhook`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(signature === null ? {} : { 'stripe-signature': signature }),
      },
      body: payload,
    })
    return { status: res.status, body: (await res.json()) as Envelope }
  }
  const register = async () => {
    counter += 1
    const email = `billing-${counter}@example.com`
    const { body, cookie } = await call('POST', '/auth/register', {
      body: { email, password: PASSWORD },
    })
    return { id: body.data.id as string, email, cookie: cookie! }
  }
  const stop = () =>
    new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()))
    })
  return { call, webhook, register, stop }
}

describe('abonnement Premium avec Stripe', () => {
  const gateway = new FakeBillingGateway()
  let api: Awaited<ReturnType<typeof start>>

  beforeAll(async () => {
    api = await start(gateway)
  })
  afterAll(() => api.stop())

  it('réserve le paiement, le portail et l’état de l’abonnement à un compte connecté', async () => {
    for (const [method, path] of [
      ['POST', '/billing/checkout'],
      ['POST', '/billing/portal'],
      ['GET', '/billing/subscription'],
    ] as const) {
      const body = method === 'POST' ? { plan: 'monthly' } : undefined
      expect(await api.call(method, path, { body }), path).toMatchObject({
        status: 401,
        body: { error: MESSAGES.unauthenticated },
      })
    }
  })

  it('ouvre une page de paiement Stripe pour la formule demandée', async () => {
    const ada = await api.register()

    const res = await api.call('POST', '/billing/checkout', {
      body: { plan: 'yearly' },
      cookie: ada.cookie,
    })

    expect(res.status).toBe(201)
    expect(res.body.data).toEqual({ url: 'https://checkout.stripe.test/yearly' })
    expect(gateway.checkouts.at(-1)).toEqual({
      userId: ada.id,
      email: ada.email,
      plan: 'yearly',
      customerId: null,
    })
  })

  it('refuse en 400 une formule inconnue', async () => {
    const ada = await api.register()

    for (const body of [{}, { plan: 'weekly' }]) {
      const res = await api.call('POST', '/billing/checkout', { body, cookie: ada.cookie })
      expect(res.status, JSON.stringify(body)).toBe(400)
      expect(res.body.error).toBe(MESSAGES.invalidPlan)
    }
  })

  it('active le Premium au webhook de Stripe : le contenu verrouillé s’ouvre', async () => {
    const ada = await api.register()
    expect((await api.call('GET', LOCKED_LESSON, { cookie: ada.cookie })).status).toBe(403)

    const payload = webhookPayload(subscription(ada.id, { plan: 'monthly' }))
    const res = await api.webhook(payload)

    expect(res).toMatchObject({ status: 200, body: { success: true, data: { received: true } } })
    expect(gateway.payloads.at(-1)).toBe(payload)
    expect((await api.call('GET', LOCKED_LESSON, { cookie: ada.cookie })).status).toBe(200)
    expect(
      (await api.call('GET', '/billing/subscription', { cookie: ada.cookie })).body.data,
    ).toEqual({
      premium: true,
      subscription: {
        status: 'active',
        plan: 'monthly',
        currentPeriodEnd: '2099-01-01T00:00:00.000Z',
      },
    })
  })

  it('accepte un webhook rejoué, et reverrouille à la résiliation', async () => {
    const ada = await api.register()
    const active = webhookPayload(subscription(ada.id))

    expect((await api.webhook(active)).status).toBe(200)
    expect((await api.webhook(active)).status).toBe(200)
    expect((await api.call('GET', LOCKED_LESSON, { cookie: ada.cookie })).status).toBe(200)

    await api.webhook(
      webhookPayload(subscription(ada.id, { status: 'canceled', currentPeriodEnd: PAST })),
    )
    expect((await api.call('GET', LOCKED_LESSON, { cookie: ada.cookie })).status).toBe(403)
  })

  it('refuse en 400 un webhook sans signature ou mal signé', async () => {
    const ada = await api.register()
    const payload = webhookPayload(subscription(ada.id))

    for (const signature of [null, 'fausse']) {
      expect(await api.webhook(payload, signature), String(signature)).toMatchObject({
        status: 400,
        body: { error: MESSAGES.invalidWebhookSignature },
      })
    }
    expect((await api.call('GET', LOCKED_LESSON, { cookie: ada.cookie })).status).toBe(403)
  })

  it('refuse en 409 le paiement d’un compte déjà Premium', async () => {
    const ada = await api.register()
    await api.webhook(webhookPayload(subscription(ada.id)))

    expect(
      await api.call('POST', '/billing/checkout', {
        body: { plan: 'monthly' },
        cookie: ada.cookie,
      }),
    ).toMatchObject({ status: 409, body: { error: MESSAGES.alreadyPremium } })
  })

  it('ouvre le portail Stripe d’un abonné, 404 pour qui ne l’a jamais été', async () => {
    const ada = await api.register()
    const eve = await api.register()
    await api.webhook(webhookPayload(subscription(ada.id, { stripeCustomerId: 'cus_ada' })))

    expect(await api.call('POST', '/billing/portal', { cookie: ada.cookie })).toMatchObject({
      status: 200,
      body: { data: { url: 'https://billing.stripe.test/cus_ada' } },
    })
    expect(await api.call('POST', '/billing/portal', { cookie: eve.cookie })).toMatchObject({
      status: 404,
      body: { error: MESSAGES.noSubscription },
    })
  })

  it('décrit un compte sans abonnement', async () => {
    const eve = await api.register()

    expect(
      (await api.call('GET', '/billing/subscription', { cookie: eve.cookie })).body.data,
    ).toEqual({ premium: false, subscription: null })
  })

  it('répond 503 quand Stripe ne répond pas, sans détail interne', async () => {
    const ada = await api.register()
    gateway.failing = true
    try {
      expect(
        await api.call('POST', '/billing/checkout', {
          body: { plan: 'monthly' },
          cookie: ada.cookie,
        }),
      ).toMatchObject({ status: 503, body: { error: MESSAGES.billingUnavailable } })
    } finally {
      gateway.failing = false
    }
  })
})

describe('abonnement Premium sans Stripe configuré', () => {
  let api: Awaited<ReturnType<typeof start>>

  beforeAll(async () => {
    api = await start(null)
  })
  afterAll(() => api.stop())

  it('répond 503 au paiement, au portail et au webhook ; l’état reste lisible', async () => {
    const ada = await api.register()

    for (const path of ['/billing/checkout', '/billing/portal']) {
      expect(
        await api.call('POST', path, { body: { plan: 'monthly' }, cookie: ada.cookie }),
        path,
      ).toMatchObject({ status: 503, body: { error: MESSAGES.billingUnavailable } })
    }
    expect((await api.webhook(webhookPayload(null))).status).toBe(503)
    expect((await api.call('GET', '/billing/subscription', { cookie: ada.cookie })).status).toBe(
      200,
    )
  })
})
