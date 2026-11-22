import { PrismaClient } from '@prisma/client'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { migrateTestDatabase } from '../../../../fixtures/backend/database.fixtures.ts'
import { FUTURE, subscription } from '../../../../fixtures/backend/premium.fixtures.ts'
import { PrismaSubscriptionRepository } from '../../../../../backend/src/repository/prisma-subscription.repository.ts'
import type { SubscriptionRepository } from '../../../../../backend/src/repository/subscription.repository.ts'
import { InMemorySubscriptionRepository } from '../../../../../backend/src/repository/subscription.repository.ts'

// Vide la base : jamais DATABASE_URL, toujours la base de test.
const url = process.env.DATABASE_URL_TEST
const prisma = new PrismaClient({ datasourceUrl: url })

const BACKENDS: ReadonlyArray<readonly [string, () => SubscriptionRepository]> = url
  ? [
      ['mémoire', () => new InMemorySubscriptionRepository()],
      ['base', () => new PrismaSubscriptionRepository(prisma)],
    ]
  : [['mémoire', () => new InMemorySubscriptionRepository()]]

// Les comptes n'existent qu'en base : en memoire, n'importe quel uuid convient.
const newUser = async (email: string): Promise<string> =>
  url ? (await prisma.user.create({ data: { email, passwordHash: 'x' } })).id : crypto.randomUUID()

beforeAll(async () => {
  if (url) {
    await migrateTestDatabase(prisma, url)
  }
}, 60_000)

beforeEach(async () => {
  if (url) {
    await prisma.$executeRawUnsafe('DELETE FROM subscription')
    await prisma.$executeRawUnsafe('DELETE FROM users')
  }
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe.each(BACKENDS)('dépôt des abonnements (%s)', (_name, open) => {
  let subscriptions: SubscriptionRepository
  beforeEach(() => {
    subscriptions = open()
  })

  it('ne trouve rien pour un compte sans abonnement', async () => {
    expect(await subscriptions.findByUser(await newUser('ada@example.com'))).toBeNull()
  })

  it('enregistre un abonnement et le retrouve par son compte', async () => {
    const userId = await newUser('ada@example.com')

    const saved = await subscriptions.save(subscription(userId, { plan: 'yearly' }))

    expect(saved).toMatchObject({
      userId,
      status: 'active',
      plan: 'yearly',
      currentPeriodEnd: FUTURE,
      stripeCustomerId: `cus_${userId}`,
      stripeSubscriptionId: `sub_${userId}`,
    })
    expect(await subscriptions.findByUser(userId)).toEqual(saved)
  })

  it('garde un seul abonnement par compte : le suivant remplace le précédent', async () => {
    const userId = await newUser('ada@example.com')
    const first = await subscriptions.save(subscription(userId))

    const next = await subscriptions.save(
      subscription(userId, { status: 'canceled', stripeSubscriptionId: 'sub_suivant' }),
    )

    expect(next.id).toBe(first.id)
    expect(await subscriptions.findByUser(userId)).toMatchObject({
      status: 'canceled',
      stripeSubscriptionId: 'sub_suivant',
    })
  })

  it('sépare les abonnements de deux comptes', async () => {
    const ada = await newUser('ada@example.com')
    const eve = await newUser('eve@example.com')
    await subscriptions.save(subscription(ada))

    expect(await subscriptions.findByUser(eve)).toBeNull()
  })
})
