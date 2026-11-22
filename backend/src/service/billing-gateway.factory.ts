import Stripe from 'stripe'

import type { Config } from '../config.ts'
import type { BillingGateway } from './billing-gateway.ts'
import { StripeBillingGateway } from './stripe-billing-gateway.ts'

type StripeConfig = Pick<Config, 'FRONTEND_URL'> &
  Partial<
    Pick<
      Config,
      'STRIPE_SECRET_KEY' | 'STRIPE_WEBHOOK_SECRET' | 'STRIPE_PRICE_MONTHLY' | 'STRIPE_PRICE_YEARLY'
    >
  >

export function createBillingGateway(config: StripeConfig): BillingGateway | null {
  const { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_MONTHLY, STRIPE_PRICE_YEARLY } =
    config
  if (
    !STRIPE_SECRET_KEY ||
    !STRIPE_WEBHOOK_SECRET ||
    !STRIPE_PRICE_MONTHLY ||
    !STRIPE_PRICE_YEARLY
  ) {
    return null
  }
  return new StripeBillingGateway(new Stripe(STRIPE_SECRET_KEY), {
    webhookSecret: STRIPE_WEBHOOK_SECRET,
    prices: { monthly: STRIPE_PRICE_MONTHLY, yearly: STRIPE_PRICE_YEARLY },
    frontendUrl: config.FRONTEND_URL,
  })
}
