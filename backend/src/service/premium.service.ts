import type { UserRole } from '@scalar/shared/enums'

import type { Subscription } from '../entity/subscription.entity.ts'
import type { SubscriptionRepository } from '../repository/subscription.repository.ts'
import type { UserRepository } from '../repository/user.repository.ts'

/** Un admin relit tout sans payer ; sinon, un abonnement `active` dont la periode court encore. */
export function opensPremium(
  role: UserRole,
  subscription: Subscription | null,
  now: Date,
): boolean {
  return (
    role === 'admin' ||
    (subscription !== null &&
      subscription.status === 'active' &&
      subscription.currentPeriodEnd > now)
  )
}

export class PremiumService {
  private readonly users: UserRepository
  private readonly subscriptions: SubscriptionRepository
  private readonly freeChapters: number
  private readonly now: () => Date

  constructor(
    users: UserRepository,
    subscriptions: SubscriptionRepository,
    freeChapters: number,
    now: () => Date = () => new Date(),
  ) {
    this.users = users
    this.subscriptions = subscriptions
    this.freeChapters = freeChapters
    this.now = now
  }

  async isPremium(userId: string | null): Promise<boolean> {
    if (userId === null) {
      return false
    }
    const user = await this.users.findById(userId)
    if (!user) {
      return false
    }
    const subscription = user.role === 'admin' ? null : await this.subscriptions.findByUser(userId)
    return opensPremium(user.role, subscription, this.now())
  }

  /** `number` est le rang du chapitre dans son parcours, a partir de 1. */
  isFreeChapter(number: number): boolean {
    return number <= this.freeChapters
  }

  /** Tous ses chapitres publies dans le seuil : son certificat aussi est gratuit. */
  isFreeTrack(chapterCount: number): boolean {
    return this.isFreeChapter(chapterCount)
  }
}
