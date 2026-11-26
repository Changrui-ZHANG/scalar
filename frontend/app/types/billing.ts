export type SubscriptionPlan = 'monthly' | 'yearly'

// GET /billing/subscription
export interface SubscriptionView {
  // Vrai pour un abonnement actif dont la période court encore, et pour un admin.
  readonly premium: boolean
  readonly subscription: {
    readonly status: 'active' | 'past_due' | 'canceled'
    readonly plan: SubscriptionPlan
    readonly currentPeriodEnd: string
  } | null
}
