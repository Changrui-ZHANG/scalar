import type { SubscriptionPlan, SubscriptionStatus } from '@scalar/shared/enums'

export interface Subscription {
  id: number
  userId: string
  status: SubscriptionStatus
  plan: SubscriptionPlan
  currentPeriodEnd: Date
  stripeCustomerId: string
  stripeSubscriptionId: string
  createdAt: Date
  updatedAt: Date
}
