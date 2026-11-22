import { PrismaClient } from '@prisma/client'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { migrateTestDatabase } from '../../../../fixtures/backend/database.fixtures.ts'
import { subscription } from '../../../../fixtures/backend/premium.fixtures.ts'
import { CONTENT, seedDatabase } from '../../../../../backend/src/database/seed.ts'
import type { CertificateRepository } from '../../../../../backend/src/repository/certificate.repository.ts'
import { InMemoryCertificateRepository } from '../../../../../backend/src/repository/certificate.repository.ts'
import { PrismaCertificateRepository } from '../../../../../backend/src/repository/prisma-certificate.repository.ts'
import { PrismaProgressRepository } from '../../../../../backend/src/repository/prisma-progress.repository.ts'
import { PrismaSubscriptionRepository } from '../../../../../backend/src/repository/prisma-subscription.repository.ts'
import { PrismaUserRepository } from '../../../../../backend/src/repository/prisma-user.repository.ts'
import type { ProgressRepository } from '../../../../../backend/src/repository/progress.repository.ts'
import { InMemoryProgressRepository } from '../../../../../backend/src/repository/progress.repository.ts'
import type { SubscriptionRepository } from '../../../../../backend/src/repository/subscription.repository.ts'
import { InMemorySubscriptionRepository } from '../../../../../backend/src/repository/subscription.repository.ts'
import type { UserRepository } from '../../../../../backend/src/repository/user.repository.ts'
import { InMemoryUserRepository } from '../../../../../backend/src/repository/user.repository.ts'

// Vide la base : jamais DATABASE_URL, toujours la base de test.
const url = process.env.DATABASE_URL_TEST
const prisma = new PrismaClient({ datasourceUrl: url })

interface Repositories {
  readonly users: UserRepository
  readonly subscriptions: SubscriptionRepository
  readonly progress: ProgressRepository
  readonly certificates: CertificateRepository
}

const BACKENDS: ReadonlyArray<readonly [string, () => Repositories]> = [
  [
    'mémoire',
    () => ({
      users: new InMemoryUserRepository(),
      subscriptions: new InMemorySubscriptionRepository(),
      progress: new InMemoryProgressRepository(),
      certificates: new InMemoryCertificateRepository(),
    }),
  ],
  ...(url
    ? [
        [
          'base',
          () => ({
            users: new PrismaUserRepository(prisma),
            subscriptions: new PrismaSubscriptionRepository(prisma),
            progress: new PrismaProgressRepository(prisma),
            certificates: new PrismaCertificateRepository(prisma),
          }),
        ] as const,
      ]
    : []),
]

const [FIRST, SECOND] = CONTENT.exercises
const TRACK = CONTENT.tracks[0]!
const AT = new Date('2026-11-22T10:00:00Z')

beforeAll(async () => {
  if (url) {
    await migrateTestDatabase(prisma, url)
    await seedDatabase(prisma)
  }
}, 60_000)

beforeEach(async () => {
  if (url) {
    await prisma.$executeRawUnsafe('DELETE FROM users')
  }
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe.each(BACKENDS)('lectures du backoffice sur les comptes (%s)', (_name, open) => {
  let repos: Repositories
  beforeEach(() => {
    repos = open()
  })

  it('liste les comptes inscrits, du plus récent au plus ancien, admins compris', async () => {
    await repos.users.createAnonymous()
    const ada = (await repos.users.create({ email: 'ada@example.com', passwordHash: 'x' }))!
    await new Promise((resolve) => setTimeout(resolve, 5))
    const admin = await repos.users.upsertAdmin({ email: 'admin@example.com', passwordHash: 'x' })

    expect((await repos.users.listRegistered()).map((u) => u.id)).toEqual([admin.id, ada.id])
  })

  it('cherche un morceau d’email sans tenir compte de la casse, % et _ compris à la lettre', async () => {
    await repos.users.create({ email: 'ada.lovelace@example.com', passwordHash: 'x' })
    await repos.users.create({ email: 'eve_100%@example.org', passwordHash: 'x' })

    expect((await repos.users.listRegistered('LOVE')).map((u) => u.email)).toEqual([
      'ada.lovelace@example.com',
    ])
    expect((await repos.users.listRegistered('_100%')).map((u) => u.email)).toEqual([
      'eve_100%@example.org',
    ])
    expect(await repos.users.listRegistered('%')).toHaveLength(1)
  })

  it('compte les apprenants anonymes et inscrits, sans les admins', async () => {
    await repos.users.createAnonymous()
    await repos.users.createAnonymous()
    await repos.users.create({ email: 'ada@example.com', passwordHash: 'x' })
    await repos.users.upsertAdmin({ email: 'admin@example.com', passwordHash: 'x' })

    expect(await repos.users.countLearners()).toEqual({ anonymous: 2, registered: 1 })
  })

  it('liste tous les abonnements', async () => {
    const ada = (await repos.users.create({ email: 'ada@example.com', passwordHash: 'x' }))!
    const eve = (await repos.users.create({ email: 'eve@example.com', passwordHash: 'x' }))!
    await repos.subscriptions.save(subscription(ada.id))
    await repos.subscriptions.save(subscription(eve.id, { status: 'canceled' }))

    expect((await repos.subscriptions.listAll()).map((s) => [s.userId, s.status]).sort()).toEqual(
      [
        [ada.id, 'active'],
        [eve.id, 'canceled'],
      ].sort(),
    )
  })

  it('compte les exercices tentés et réussis, une fois par apprenant et par exercice', async () => {
    const ada = await repos.users.createAnonymous()
    const eve = await repos.users.createAnonymous()
    await repos.progress.recordAttempt(ada.id, FIRST!.id, false, AT)
    await repos.progress.recordAttempt(ada.id, FIRST!.id, true, AT)
    await repos.progress.recordAttempt(ada.id, SECOND!.id, false, AT)
    await repos.progress.recordAttempt(eve.id, FIRST!.id, true, AT)

    expect(await repos.progress.countAttempts()).toEqual({ attempted: 3, passed: 2 })
  })

  it('compte les certificats délivrés', async () => {
    const ada = await repos.users.createAnonymous()
    expect(await repos.certificates.countCertificates()).toBe(0)

    await repos.certificates.issue({
      code: 'AAAAA-AAAAA',
      userId: ada.id,
      trackId: TRACK.id,
      holderName: 'Ada',
      issuedAt: AT,
    })

    expect(await repos.certificates.countCertificates()).toBe(1)
  })
})
