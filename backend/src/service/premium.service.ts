import type { SubscriptionRepository } from '../repository/subscription.repository.ts'
import type { UserRepository } from '../repository/user.repository.ts'

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

  /** Un admin relit tout le contenu sans payer. */
  async isPremium(userId: string | null): Promise<boolean> {
    if (userId === null) {
      return false
    }
    const user = await this.users.findById(userId)
    if (!user) {
      return false
    }
    if (user.role === 'admin') {
      return true
    }
    const subscription = await this.subscriptions.findByUser(userId)
    return (
      subscription !== null &&
      subscription.status === 'active' &&
      subscription.currentPeriodEnd > this.now()
    )
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
