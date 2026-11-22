import type { PrismaClient } from '@prisma/client'

import type { Subscription } from '../entity/subscription.entity.ts'
import type { NewSubscription, SubscriptionRepository } from './subscription.repository.ts'

export class PrismaSubscriptionRepository implements SubscriptionRepository {
  private readonly prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  async findByUser(userId: string): Promise<Subscription | null> {
    return this.prisma.subscription.findUnique({ where: { userId } })
  }

  async listAll(): Promise<readonly Subscription[]> {
    return this.prisma.subscription.findMany()
  }

  async save(subscription: NewSubscription): Promise<Subscription> {
    return this.prisma.subscription.upsert({
      where: { userId: subscription.userId },
      create: subscription,
      update: subscription,
    })
  }
}
