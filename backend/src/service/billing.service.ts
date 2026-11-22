import type { SubscriptionPlan, SubscriptionStatus } from '@scalar/shared/enums'

import type { SubscriptionRepository } from '../repository/subscription.repository.ts'
import type { UserRepository } from '../repository/user.repository.ts'
import type { BillingGateway } from './billing-gateway.ts'
import { InvalidWebhookSignatureError } from './invalid-webhook-signature.error.ts'
import type { PremiumService } from './premium.service.ts'

export type RedirectOutcome =
  { readonly status: 'created'; readonly url: string } | { readonly status: 'unavailable' }

export type CheckoutOutcome = RedirectOutcome | { readonly status: 'already-premium' }

export type PortalOutcome = RedirectOutcome | { readonly status: 'no-subscription' }

export type WebhookOutcome = 'handled' | 'invalid-signature' | 'unavailable'

export interface SubscriptionView {
  readonly premium: boolean
  readonly subscription: {
    readonly status: SubscriptionStatus
    readonly plan: SubscriptionPlan
    readonly currentPeriodEnd: string
  } | null
}

export class BillingService {
  private readonly users: UserRepository
  private readonly subscriptions: SubscriptionRepository
  private readonly premium: PremiumService
  private readonly gateway: BillingGateway | null

  constructor(
    users: UserRepository,
    subscriptions: SubscriptionRepository,
    premium: PremiumService,
    gateway: BillingGateway | null,
  ) {
    this.users = users
    this.subscriptions = subscriptions
    this.premium = premium
    this.gateway = gateway
  }

  async checkout(userId: string, plan: SubscriptionPlan): Promise<CheckoutOutcome> {
    if (!this.gateway) {
      return { status: 'unavailable' }
    }
    if (await this.premium.isPremium(userId)) {
      return { status: 'already-premium' }
    }
    const user = await this.users.findById(userId)
    if (!user?.email) {
      throw new Error(`Paiement demande pour un compte sans email : ${userId}`)
    }
    const previous = await this.subscriptions.findByUser(userId)
    const url = await this.gateway.createCheckout({
      userId,
      email: user.email,
      plan,
      customerId: previous?.stripeCustomerId ?? null,
    })
    return { status: 'created', url }
  }

  async portal(userId: string): Promise<PortalOutcome> {
    if (!this.gateway) {
      return { status: 'unavailable' }
    }
    const subscription = await this.subscriptions.findByUser(userId)
    if (!subscription) {
      return { status: 'no-subscription' }
    }
    return {
      status: 'created',
      url: await this.gateway.createPortal(subscription.stripeCustomerId),
    }
  }

  /** Rejouer un evenement recopie le meme etat : idempotent sans memoriser les evenements recus. */
  async handleWebhook(payload: Buffer, signature: string): Promise<WebhookOutcome> {
    if (!this.gateway) {
      return 'unavailable'
    }
    let subscription
    try {
      subscription = await this.gateway.readEvent(payload, signature)
    } catch (error: unknown) {
      if (error instanceof InvalidWebhookSignatureError) {
        return 'invalid-signature'
      }
      throw error
    }
    // Un compte supprime depuis : rien a enregistrer, mais Stripe ne doit pas reessayer.
    if (subscription && (await this.users.findById(subscription.userId))) {
      await this.subscriptions.save(subscription)
    }
    return 'handled'
  }

  async status(userId: string): Promise<SubscriptionView> {
    const subscription = await this.subscriptions.findByUser(userId)
    return {
      premium: await this.premium.isPremium(userId),
      subscription: subscription && {
        status: subscription.status,
        plan: subscription.plan,
        currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
      },
    }
  }
}
