import type { Subscription } from '../entity/subscription.entity.ts'

export type NewSubscription = Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>

export interface SubscriptionRepository {
  findByUser(userId: string): Promise<Subscription | null>
  /** Un seul abonnement par compte : remplace celui qui existe deja. */
  save(subscription: NewSubscription): Promise<Subscription>
  listAll(): Promise<readonly Subscription[]>
}

export class InMemorySubscriptionRepository implements SubscriptionRepository {
  private readonly subscriptions = new Map<string, Subscription>()

  async findByUser(userId: string): Promise<Subscription | null> {
    const found = this.subscriptions.get(userId)
    return found ? { ...found } : null
  }

  async listAll(): Promise<readonly Subscription[]> {
    return [...this.subscriptions.values()].map((s) => ({ ...s }))
  }

  async save(subscription: NewSubscription): Promise<Subscription> {
    const existing = this.subscriptions.get(subscription.userId)
    const now = new Date()
    const saved: Subscription = {
      id: existing?.id ?? this.subscriptions.size + 1,
      ...subscription,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    this.subscriptions.set(subscription.userId, saved)
    return { ...saved }
  }
}
