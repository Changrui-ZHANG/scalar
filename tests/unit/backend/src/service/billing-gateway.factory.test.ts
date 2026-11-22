import { describe, expect, it } from 'vitest'

import { createBillingGateway } from '../../../../../backend/src/service/billing-gateway.factory.ts'
import { StripeBillingGateway } from '../../../../../backend/src/service/stripe-billing-gateway.ts'

const STRIPE = {
  STRIPE_SECRET_KEY: 'sk_test_x',
  STRIPE_WEBHOOK_SECRET: 'whsec_x',
  STRIPE_PRICE_MONTHLY: 'price_m',
  STRIPE_PRICE_YEARLY: 'price_y',
  FRONTEND_URL: 'http://localhost:3000',
}

describe('createBillingGateway', () => {
  it('branche Stripe quand la clé, le secret du webhook et les deux prix sont là', () => {
    expect(createBillingGateway(STRIPE)).toBeInstanceOf(StripeBillingGateway)
  })

  it('ne branche rien s’il en manque un : le paiement répond alors 503', () => {
    for (const missing of [
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'STRIPE_PRICE_MONTHLY',
      'STRIPE_PRICE_YEARLY',
    ] as const) {
      expect(createBillingGateway({ ...STRIPE, [missing]: undefined }), missing).toBeNull()
    }
  })
})
