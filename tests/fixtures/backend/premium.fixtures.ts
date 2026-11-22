import type { NewSubscription } from '../../../backend/src/repository/subscription.repository.ts'
import { InMemorySubscriptionRepository } from '../../../backend/src/repository/subscription.repository.ts'

export const FUTURE = new Date('2099-01-01T00:00:00Z')
export const PAST = new Date('2000-01-01T00:00:00Z')

export function subscription(
  userId: string,
  extra: Partial<NewSubscription> = {},
): NewSubscription {
  return {
    userId,
    status: 'active',
    plan: 'monthly',
    currentPeriodEnd: FUTURE,
    stripeCustomerId: `cus_${userId}`,
    stripeSubscriptionId: `sub_${userId}`,
    ...extra,
  }
}

/** Dependances de `buildApp` pour les tests qui ne portent pas sur le verrou Premium. */
export function allChaptersFree() {
  return {
    subscriptions: new InMemorySubscriptionRepository(),
    freeChapters: Number.POSITIVE_INFINITY,
  }
}
