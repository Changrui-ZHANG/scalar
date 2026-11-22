import type { NewSubscription } from '../../../backend/src/repository/subscription.repository.ts'
import type {
  BillingGateway,
  CheckoutRequest,
} from '../../../backend/src/service/billing-gateway.ts'
import { BillingUnavailableError } from '../../../backend/src/service/billing-unavailable.error.ts'
import { InvalidWebhookSignatureError } from '../../../backend/src/service/invalid-webhook-signature.error.ts'

export const VALID_SIGNATURE = 'signature-valide'

/** Corps d'un webhook du faux Stripe : l'abonnement qu'il annonce, ou null pour un evenement ignore. */
export function webhookPayload(subscription: NewSubscription | null): string {
  return JSON.stringify({ subscription })
}

export class FakeBillingGateway implements BillingGateway {
  readonly checkouts: CheckoutRequest[] = []
  readonly portals: string[] = []
  readonly payloads: string[] = []
  failing = false

  async createCheckout(request: CheckoutRequest): Promise<string> {
    this.failIfAsked()
    this.checkouts.push(request)
    return `https://checkout.stripe.test/${request.plan}`
  }

  async createPortal(customerId: string): Promise<string> {
    this.failIfAsked()
    this.portals.push(customerId)
    return `https://billing.stripe.test/${customerId}`
  }

  async readEvent(payload: Buffer, signature: string): Promise<NewSubscription | null> {
    if (signature !== VALID_SIGNATURE) {
      throw new InvalidWebhookSignatureError()
    }
    this.payloads.push(payload.toString('utf8'))
    const { subscription } = JSON.parse(payload.toString('utf8')) as {
      subscription:
        (Omit<NewSubscription, 'currentPeriodEnd'> & { currentPeriodEnd: string }) | null
    }
    return (
      subscription && { ...subscription, currentPeriodEnd: new Date(subscription.currentPeriodEnd) }
    )
  }

  private failIfAsked(): void {
    if (this.failing) {
      throw new BillingUnavailableError(new Error('Stripe en panne'))
    }
  }
}
