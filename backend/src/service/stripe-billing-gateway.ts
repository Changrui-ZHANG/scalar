import type { SubscriptionPlan, SubscriptionStatus } from '@scalar/shared/enums'
import type Stripe from 'stripe'

import type { NewSubscription } from '../repository/subscription.repository.ts'
import type { BillingGateway, CheckoutRequest } from './billing-gateway.ts'
import { BillingUnavailableError } from './billing-unavailable.error.ts'
import { InvalidWebhookSignatureError } from './invalid-webhook-signature.error.ts'

export interface StripeSettings {
  readonly webhookSecret: string
  readonly prices: Readonly<Record<SubscriptionPlan, string>>
  readonly frontendUrl: string
}

const SUBSCRIPTION_EVENTS = new Set([
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
])

// Seul ce qui est paye ouvre le Premium : un essai compte comme paye, un impaye non.
const STATUSES: Readonly<Record<string, SubscriptionStatus>> = {
  active: 'active',
  trialing: 'active',
  past_due: 'past_due',
  unpaid: 'past_due',
  incomplete: 'past_due',
  paused: 'past_due',
  canceled: 'canceled',
  incomplete_expired: 'canceled',
}

export class StripeBillingGateway implements BillingGateway {
  private readonly stripe: Stripe
  private readonly settings: StripeSettings

  constructor(stripe: Stripe, settings: StripeSettings) {
    this.stripe = stripe
    this.settings = settings
  }

  async createCheckout({ userId, email, plan, customerId }: CheckoutRequest): Promise<string> {
    const session = await this.call(() =>
      this.stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ price: this.settings.prices[plan], quantity: 1 }],
        client_reference_id: userId,
        ...(customerId === null ? { customer_email: email } : { customer: customerId }),
        // Sur l'abonnement, pas la session : chaque webhook d'abonnement retrouve ainsi le compte.
        subscription_data: { metadata: { userId } },
        success_url: `${this.settings.frontendUrl}/premium?checkout=success`,
        cancel_url: `${this.settings.frontendUrl}/premium?checkout=cancel`,
      }),
    )
    if (!session.url) {
      throw new BillingUnavailableError('Session Stripe sans URL')
    }
    return session.url
  }

  async createPortal(customerId: string): Promise<string> {
    const session = await this.call(() =>
      this.stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${this.settings.frontendUrl}/premium`,
      }),
    )
    return session.url
  }

  async readEvent(payload: Buffer, signature: string): Promise<NewSubscription | null> {
    let event: Stripe.Event
    try {
      event = await this.stripe.webhooks.constructEventAsync(
        payload,
        signature,
        this.settings.webhookSecret,
      )
    } catch (error: unknown) {
      throw new InvalidWebhookSignatureError(error)
    }
    if (!SUBSCRIPTION_EVENTS.has(event.type)) {
      return null
    }
    // L'etat du moment, pas celui de l'evenement : Stripe ne garantit pas l'ordre de livraison.
    const { id } = event.data.object as { id: string }
    return this.toSubscription(await this.call(() => this.stripe.subscriptions.retrieve(id)))
  }

  private toSubscription(subscription: Stripe.Subscription): NewSubscription | null {
    const userId = subscription.metadata.userId
    const item = subscription.items.data[0]
    const plan = (Object.keys(this.settings.prices) as SubscriptionPlan[]).find(
      (p) => this.settings.prices[p] === item?.price.id,
    )
    if (!userId || !item || !plan) {
      return null
    }
    return {
      userId,
      status: STATUSES[subscription.status] ?? 'past_due',
      plan,
      currentPeriodEnd: new Date(item.current_period_end * 1000),
      stripeCustomerId:
        typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id,
      stripeSubscriptionId: subscription.id,
    }
  }

  private async call<T>(request: () => Promise<T>): Promise<T> {
    try {
      return await request()
    } catch (error: unknown) {
      throw new BillingUnavailableError(error)
    }
  }
}
