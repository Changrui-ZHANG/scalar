import { PrismaClient } from '@prisma/client'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { migrateTestDatabase } from '../database.fixtures.ts'
import { CONTENT, seedDatabase } from '../../../backend/src/database/seed.ts'
import type { PlacementRepository } from '../../../backend/src/repository/placement.repository.ts'
import { InMemoryPlacementRepository } from '../../../backend/src/repository/placement.repository.ts'
import { PrismaPlacementRepository } from '../../../backend/src/repository/prisma-placement.repository.ts'

// Vide la base : jamais DATABASE_URL, toujours la base de test.
const url = process.env.DATABASE_URL_TEST
const prisma = new PrismaClient({ datasourceUrl: url })

const BACKENDS: ReadonlyArray<readonly [string, () => PlacementRepository]> = url
  ? [
      ['mémoire', () => new InMemoryPlacementRepository()],
      ['base', () => new PrismaPlacementRepository(prisma)],
    ]
  : [['mémoire', () => new InMemoryPlacementRepository()]]

const TRACK = CONTENT.tracks[0]!
const AT = new Date('2026-11-06T10:00:00Z')
const result = {
  score: 74,
  level: 'intermediate',
  trackId: TRACK.id,
  declared: 1 / 3,
  knowledge: 1,
  practical: 0.9,
  createdAt: AT,
} as const

// Les comptes n'existent qu'en base : en memoire, n'importe quel uuid convient.
const newUser = async (email: string): Promise<string> =>
  url ? (await prisma.user.create({ data: { email, passwordHash: 'x' } })).id : crypto.randomUUID()

beforeAll(async () => {
  if (url) {
    await migrateTestDatabase(prisma, url)
    await seedDatabase(prisma)
  }
}, 60_000)

beforeEach(async () => {
  if (url) {
    await prisma.$executeRawUnsafe('DELETE FROM placement')
    await prisma.$executeRawUnsafe('DELETE FROM users')
  }
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe.each(BACKENDS)('dépôt des positionnements (%s)', (_name, open) => {
  let placements: PlacementRepository
  beforeEach(() => {
    placements = open()
  })

  it('enregistre un résultat anonyme, retrouvé par son id', async () => {
    const saved = await placements.save(result)

    expect(saved).toEqual({ id: expect.any(Number), ...result, userId: null })
    expect(await placements.findById(saved.id)).toEqual(saved)
  })

  it('répond null pour un id inconnu', async () => {
    expect(await placements.findById(999_999)).toBeNull()
    expect(await placements.assignToUser(999_999, await newUser('ada@example.org'))).toBeNull()
  })

  it('rattache un résultat à un compte, de façon idempotente', async () => {
    const saved = await placements.save(result)
    const userId = await newUser('ada@example.org')

    expect(await placements.assignToUser(saved.id, userId)).toEqual({ ...saved, userId })
    expect(await placements.assignToUser(saved.id, userId)).toEqual({ ...saved, userId })
  })

  it('refuse de rattacher à un autre compte un résultat déjà repris', async () => {
    const saved = await placements.save(result)
    const ada = await newUser('ada@example.org')
    const bob = await newUser('bob@example.org')
    await placements.assignToUser(saved.id, ada)

    expect(await placements.assignToUser(saved.id, bob)).toBeNull()
    expect((await placements.findById(saved.id))?.userId).toBe(ada)
  })
})

describe.skipIf(!url)('table placement', () => {
  it.each([
    ['un score au-delà de 100', { score: 101 }],
    ['un score négatif', { score: -1 }],
    ['un sous-score au-delà de 1', { practical: 1.5 }],
    ['un sous-score négatif', { declared: -0.1 }],
    ['le niveau ecosystem', { level: 'ecosystem' as const }],
  ])('la base refuse %s', async (_cas, invalid) => {
    await expect(prisma.placement.create({ data: { ...result, ...invalid } })).rejects.toThrow()
  })

  it('la base refuse un parcours inconnu', async () => {
    await expect(
      prisma.placement.create({ data: { ...result, trackId: 999_999 } }),
    ).rejects.toThrow()
  })

  it('supprimer un compte supprime ses résultats, pas ceux des anonymes', async () => {
    const repository = new PrismaPlacementRepository(prisma)
    const mine = await repository.save(result)
    const anonymous = await repository.save(result)
    const userId = await newUser('ada@example.org')
    await repository.assignToUser(mine.id, userId)

    await prisma.user.delete({ where: { id: userId } })

    expect(await repository.findById(mine.id)).toBeNull()
    expect(await repository.findById(anonymous.id)).not.toBeNull()
  })

  it('réinjecter le contenu vide les résultats', async () => {
    await new PrismaPlacementRepository(prisma).save(result)

    await seedDatabase(prisma)

    expect(await prisma.placement.count()).toBe(0)
  })
})
