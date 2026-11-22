import Stripe from 'stripe'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { BillingUnavailableError } from '../../../../../backend/src/service/billing-unavailable.error.ts'
import { InvalidWebhookSignatureError } from '../../../../../backend/src/service/invalid-webhook-signature.error.ts'
import { StripeBillingGateway } from '../../../../../backend/src/service/stripe-billing-gateway.ts'

const WEBHOOK_SECRET = 'whsec_test_secret'
const SETTINGS = {
  webhookSecret: WEBHOOK_SECRET,
  prices: { monthly: 'price_mensuel', yearly: 'price_annuel' },
  frontendUrl: 'http://localhost:3000',
}
const USER = '11111111-1111-4111-8111-111111111111'
const PERIOD_END = 1_798_761_600

let stripe: Stripe
let gateway: StripeBillingGateway

/** Un abonnement tel que l'API Stripe le renvoie, reduit aux champs lus. */
function stripeSubscription(extra: Record<string, unknown> = {}) {
  return {
    id: 'sub_123',
    object: 'subscription',
    customer: 'cus_123',
    status: 'active',
    metadata: { userId: USER },
    items: {
      object: 'list',
      data: [{ price: { id: 'price_mensuel' }, current_period_end: PERIOD_END }],
    },
    ...extra,
  }
}

function signedEvent(type: string, object: unknown) {
  const payload = JSON.stringify({ id: 'evt_1', object: 'event', type, data: { object } })
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET })
  return [Buffer.from(payload), signature] as const
}

beforeEach(() => {
  stripe = new Stripe('sk_test_fausse_cle')
  gateway = new StripeBillingGateway(stripe, SETTINGS)
})

describe('StripeBillingGateway.createCheckout', () => {
  it('crée une session d’abonnement au prix de la formule, rattachée au compte', async () => {
    const create = vi
      .spyOn(stripe.checkout.sessions, 'create')
      .mockResolvedValue({ url: 'https://checkout.stripe.com/c/pay/cs_1' } as never)

    const url = await gateway.createCheckout({
      userId: USER,
      email: 'ada@example.com',
      plan: 'yearly',
      customerId: null,
    })

    expect(url).toBe('https://checkout.stripe.com/c/pay/cs_1')
    expect(create).toHaveBeenCalledWith({
      mode: 'subscription',
      line_items: [{ price: 'price_annuel', quantity: 1 }],
      client_reference_id: USER,
      customer_email: 'ada@example.com',
      subscription_data: { metadata: { userId: USER } },
      success_url: 'http://localhost:3000/premium?checkout=success',
      cancel_url: 'http://localhost:3000/premium?checkout=cancel',
    })
  })

  it('reprend le client Stripe connu au lieu de l’email', async () => {
    const create = vi
      .spyOn(stripe.checkout.sessions, 'create')
      .mockResolvedValue({ url: 'https://checkout.stripe.com/c/pay/cs_2' } as never)

    await gateway.createCheckout({
      userId: USER,
      email: 'ada@example.com',
      plan: 'monthly',
      customerId: 'cus_ada',
    })

    const params = create.mock.calls[0]![0]!
    expect(params.customer).toBe('cus_ada')
    expect(params.customer_email).toBeUndefined()
    expect(params.line_items).toEqual([{ price: 'price_mensuel', quantity: 1 }])
  })

  it('signale Stripe indisponible sur une erreur de l’API', async () => {
    vi.spyOn(stripe.checkout.sessions, 'create').mockRejectedValue(new Error('réseau coupé'))

    await expect(
      gateway.createCheckout({ userId: USER, email: 'a@b.fr', plan: 'monthly', customerId: null }),
    ).rejects.toBeInstanceOf(BillingUnavailableError)
  })
})

describe('StripeBillingGateway.createPortal', () => {
  it('ouvre le portail du client, avec retour sur la page Premium', async () => {
    const create = vi
      .spyOn(stripe.billingPortal.sessions, 'create')
      .mockResolvedValue({ url: 'https://billing.stripe.com/p/session/1' } as never)

    expect(await gateway.createPortal('cus_ada')).toBe('https://billing.stripe.com/p/session/1')
    expect(create).toHaveBeenCalledWith({
      customer: 'cus_ada',
      return_url: 'http://localhost:3000/premium',
    })
  })
})

describe('StripeBillingGateway.readEvent', () => {
  it('refuse une signature fausse ou celle d’un autre secret', async () => {
    const payload = Buffer.from(
      JSON.stringify({ id: 'evt_1', type: 'customer.subscription.updated' }),
    )
    const other = stripe.webhooks.generateTestHeaderString({
      payload: payload.toString(),
      secret: 'whsec_autre',
    })

    for (const signature of ['t=1,v1=fausse', other]) {
      await expect(gateway.readEvent(payload, signature)).rejects.toBeInstanceOf(
        InvalidWebhookSignatureError,
      )
    }
  })

  it('relit l’abonnement chez Stripe : l’ordre d’arrivée des événements ne compte pas', async () => {
    const retrieve = vi
      .spyOn(stripe.subscriptions, 'retrieve')
      .mockResolvedValue(stripeSubscription({ status: 'past_due' }) as never)

    const read = await gateway.readEvent(
      ...signedEvent('customer.subscription.updated', stripeSubscription({ status: 'active' })),
    )

    expect(retrieve).toHaveBeenCalledWith('sub_123')
    expect(read).toEqual({
      userId: USER,
      status: 'past_due',
      plan: 'monthly',
      currentPeriodEnd: new Date(PERIOD_END * 1000),
      stripeCustomerId: 'cus_123',
      stripeSubscriptionId: 'sub_123',
    })
  })

  it('lit la création, la mise à jour et la suppression d’un abonnement', async () => {
    vi.spyOn(stripe.subscriptions, 'retrieve').mockResolvedValue(stripeSubscription() as never)

    for (const type of [
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
    ]) {
      expect(
        await gateway.readEvent(...signedEvent(type, stripeSubscription())),
        type,
      ).not.toBeNull()
    }
  })

  it('ramène les statuts Stripe aux trois statuts de Scalar', async () => {
    const retrieve = vi.spyOn(stripe.subscriptions, 'retrieve')

    for (const [stripeStatus, status] of [
      ['active', 'active'],
      ['trialing', 'active'],
      ['past_due', 'past_due'],
      ['unpaid', 'past_due'],
      ['incomplete', 'past_due'],
      ['paused', 'past_due'],
      ['canceled', 'canceled'],
      ['incomplete_expired', 'canceled'],
    ]) {
      retrieve.mockResolvedValue(stripeSubscription({ status: stripeStatus }) as never)
      const read = await gateway.readEvent(
        ...signedEvent('customer.subscription.updated', stripeSubscription()),
      )
      expect(read?.status, stripeStatus).toBe(status)
    }
  })

  it('reconnaît la formule annuelle à son prix', async () => {
    vi.spyOn(stripe.subscriptions, 'retrieve').mockResolvedValue(
      stripeSubscription({
        items: { object: 'list', data: [{ price: { id: 'price_annuel' }, current_period_end: 1 }] },
      }) as never,
    )

    const read = await gateway.readEvent(
      ...signedEvent('customer.subscription.updated', stripeSubscription()),
    )

    expect(read?.plan).toBe('yearly')
  })

  it('ignore les autres événements, et les abonnements qui ne viennent pas de Scalar', async () => {
    const retrieve = vi.spyOn(stripe.subscriptions, 'retrieve')

    expect(await gateway.readEvent(...signedEvent('invoice.paid', { id: 'in_1' }))).toBeNull()
    expect(retrieve).not.toHaveBeenCalled()

    for (const foreign of [
      stripeSubscription({ metadata: {} }),
      stripeSubscription({
        items: { object: 'list', data: [{ price: { id: 'price_autre' }, current_period_end: 1 }] },
      }),
    ]) {
      retrieve.mockResolvedValue(foreign as never)
      expect(
        await gateway.readEvent(...signedEvent('customer.subscription.updated', foreign)),
      ).toBeNull()
    }
  })
})
