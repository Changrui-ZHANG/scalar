import type { SubscriptionPlan } from '@scalar/shared/enums'

import type { NewSubscription } from '../repository/subscription.repository.ts'

export interface CheckoutRequest {
  readonly userId: string
  readonly email: string
  readonly plan: SubscriptionPlan
  /** Celui d'un ancien abonnement : Stripe garde l'historique du client. */
  readonly customerId: string | null
}

/** Stripe vu par Scalar. Leve BillingUnavailableError si Stripe ne repond pas. */
export interface BillingGateway {
  /** URL de la page de paiement. */
  createCheckout(request: CheckoutRequest): Promise<string>
  /** URL du portail ou l'abonne gere ou resilie son abonnement. */
  createPortal(customerId: string): Promise<string>
  /** Leve InvalidWebhookSignatureError ; null pour un evenement sans abonnement de Scalar. */
  readEvent(payload: Buffer, signature: string): Promise<NewSubscription | null>
}
