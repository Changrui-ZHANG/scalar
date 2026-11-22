import { describe, expect, it } from 'vitest'

import {
  FakeBillingGateway,
  VALID_SIGNATURE,
  webhookPayload,
} from '../../../../fixtures/backend/fake-billing-gateway.ts'
import { FUTURE, PAST, subscription } from '../../../../fixtures/backend/premium.fixtures.ts'
import { InMemorySubscriptionRepository } from '../../../../../backend/src/repository/subscription.repository.ts'
import { InMemoryUserRepository } from '../../../../../backend/src/repository/user.repository.ts'
import { BillingService } from '../../../../../backend/src/service/billing.service.ts'
import { PremiumService } from '../../../../../backend/src/service/premium.service.ts'

async function setup(withGateway = true) {
  const users = new InMemoryUserRepository()
  const subscriptions = new InMemorySubscriptionRepository()
  const gateway = new FakeBillingGateway()
  const service = new BillingService(
    users,
    subscriptions,
    new PremiumService(users, subscriptions, 2),
    withGateway ? gateway : null,
  )
  const ada = (await users.create({ email: 'ada@example.com', passwordHash: 'x' }))!
  return { users, subscriptions, gateway, service, ada }
}

const event = (payload: string, signature = VALID_SIGNATURE) =>
  [Buffer.from(payload, 'utf8'), signature] as const

describe('BillingService.checkout', () => {
  it('ouvre une page de paiement Stripe pour la formule choisie', async () => {
    const { gateway, service, ada } = await setup()

    expect(await service.checkout(ada.id, 'yearly')).toEqual({
      status: 'created',
      url: 'https://checkout.stripe.test/yearly',
    })
    expect(gateway.checkouts).toEqual([
      { userId: ada.id, email: 'ada@example.com', plan: 'yearly', customerId: null },
    ])
  })

  it('reprend le client Stripe d’un ancien abonnement', async () => {
    const { subscriptions, gateway, service, ada } = await setup()
    await subscriptions.save(
      subscription(ada.id, { status: 'canceled', stripeCustomerId: 'cus_ada' }),
    )

    await service.checkout(ada.id, 'monthly')

    expect(gateway.checkouts[0]?.customerId).toBe('cus_ada')
  })

  it('refuse un compte déjà Premium : il paierait deux abonnements', async () => {
    const { subscriptions, gateway, service, ada } = await setup()
    await subscriptions.save(subscription(ada.id))

    expect(await service.checkout(ada.id, 'monthly')).toEqual({ status: 'already-premium' })
    expect(gateway.checkouts).toEqual([])
  })

  it('répond indisponible sans Stripe configuré', async () => {
    const { service, ada } = await setup(false)

    expect(await service.checkout(ada.id, 'monthly')).toEqual({ status: 'unavailable' })
  })
})

describe('BillingService.portal', () => {
  it('ouvre le portail Stripe du client de l’abonnement', async () => {
    const { subscriptions, gateway, service, ada } = await setup()
    await subscriptions.save(subscription(ada.id, { stripeCustomerId: 'cus_ada' }))

    expect(await service.portal(ada.id)).toEqual({
      status: 'created',
      url: 'https://billing.stripe.test/cus_ada',
    })
    expect(gateway.portals).toEqual(['cus_ada'])
  })

  it('refuse un compte qui n’a jamais été abonné', async () => {
    const { service, ada } = await setup()

    expect(await service.portal(ada.id)).toEqual({ status: 'no-subscription' })
  })

  it('répond indisponible sans Stripe configuré', async () => {
    const { service, ada } = await setup(false)

    expect(await service.portal(ada.id)).toEqual({ status: 'unavailable' })
  })
})

describe('BillingService.handleWebhook', () => {
  it('enregistre l’abonnement annoncé par Stripe', async () => {
    const { subscriptions, service, ada } = await setup()

    expect(await service.handleWebhook(...event(webhookPayload(subscription(ada.id))))).toBe(
      'handled',
    )
    expect(await subscriptions.findByUser(ada.id)).toMatchObject({
      status: 'active',
      currentPeriodEnd: FUTURE,
    })
  })

  it('suit les changements : renouvellement, échec de paiement, résiliation', async () => {
    const { subscriptions, service, ada } = await setup()

    for (const change of [
      { status: 'active', currentPeriodEnd: FUTURE },
      { status: 'past_due', currentPeriodEnd: FUTURE },
      { status: 'canceled', currentPeriodEnd: PAST },
    ] as const) {
      await service.handleWebhook(...event(webhookPayload(subscription(ada.id, change))))
      expect(await subscriptions.findByUser(ada.id), change.status).toMatchObject(change)
    }
  })

  it('est idempotent : un même événement rejoué ne change rien', async () => {
    const { subscriptions, service, ada } = await setup()
    const payload = webhookPayload(subscription(ada.id))

    await service.handleWebhook(...event(payload))
    const first = await subscriptions.findByUser(ada.id)
    await service.handleWebhook(...event(payload))

    expect(await subscriptions.findByUser(ada.id)).toMatchObject({
      id: first!.id,
      status: first!.status,
      plan: first!.plan,
      currentPeriodEnd: first!.currentPeriodEnd,
      stripeSubscriptionId: first!.stripeSubscriptionId,
    })
  })

  it('ignore un événement sans abonnement, ou celui d’un compte inconnu', async () => {
    const { subscriptions, service } = await setup()
    const stranger = '00000000-0000-4000-8000-000000000000'

    expect(await service.handleWebhook(...event(webhookPayload(null)))).toBe('handled')
    expect(await service.handleWebhook(...event(webhookPayload(subscription(stranger))))).toBe(
      'handled',
    )
    expect(await subscriptions.findByUser(stranger)).toBeNull()
  })

  it('refuse une signature invalide, sans rien enregistrer', async () => {
    const { subscriptions, service, ada } = await setup()

    expect(
      await service.handleWebhook(...event(webhookPayload(subscription(ada.id)), 'fausse')),
    ).toBe('invalid-signature')
    expect(await subscriptions.findByUser(ada.id)).toBeNull()
  })

  it('répond indisponible sans Stripe configuré', async () => {
    const { service, ada } = await setup(false)

    expect(await service.handleWebhook(...event(webhookPayload(subscription(ada.id))))).toBe(
      'unavailable',
    )
  })
})

describe('BillingService.status', () => {
  it('décrit l’abonnement du compte et dit s’il ouvre le Premium', async () => {
    const { subscriptions, service, ada } = await setup()

    expect(await service.status(ada.id)).toEqual({ premium: false, subscription: null })

    await subscriptions.save(subscription(ada.id, { plan: 'yearly' }))
    expect(await service.status(ada.id)).toEqual({
      premium: true,
      subscription: { status: 'active', plan: 'yearly', currentPeriodEnd: FUTURE.toISOString() },
    })

    await subscriptions.save(subscription(ada.id, { status: 'canceled' }))
    expect((await service.status(ada.id)).premium).toBe(false)
  })
})
