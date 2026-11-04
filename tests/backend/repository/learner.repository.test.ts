import { PrismaClient } from '@prisma/client'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { migrateTestDatabase } from '../database.fixtures.ts'
import { CONTENT, seedDatabase } from '../../../backend/src/database/seed.ts'
import type { CertificateRepository } from '../../../backend/src/repository/certificate.repository.ts'
import { InMemoryCertificateRepository } from '../../../backend/src/repository/certificate.repository.ts'
import { InvalidHolderNameError } from '../../../backend/src/repository/invalid-holder-name.error.ts'
import { PrismaCertificateRepository } from '../../../backend/src/repository/prisma-certificate.repository.ts'
import { PrismaProgressRepository } from '../../../backend/src/repository/prisma-progress.repository.ts'
import { PrismaUserRepository } from '../../../backend/src/repository/prisma-user.repository.ts'
import type { ProgressRepository } from '../../../backend/src/repository/progress.repository.ts'
import { InMemoryProgressRepository } from '../../../backend/src/repository/progress.repository.ts'
import { UnknownReferenceError } from '../../../backend/src/repository/unknown-reference.error.ts'
import type { UserRepository } from '../../../backend/src/repository/user.repository.ts'
import { InMemoryUserRepository } from '../../../backend/src/repository/user.repository.ts'

// Vide la base : jamais DATABASE_URL, toujours la base de test.
const url = process.env.DATABASE_URL_TEST
const prisma = new PrismaClient({ datasourceUrl: url })

interface Repositories {
  readonly users: UserRepository
  readonly progress: ProgressRepository
  readonly certificates: CertificateRepository
}

const memory = (): Repositories => {
  const users = new InMemoryUserRepository()
  return {
    users,
    progress: new InMemoryProgressRepository(users),
    certificates: new InMemoryCertificateRepository(users),
  }
}
const database = (): Repositories => ({
  users: new PrismaUserRepository(prisma),
  progress: new PrismaProgressRepository(prisma),
  certificates: new PrismaCertificateRepository(prisma),
})

const BACKENDS: ReadonlyArray<readonly [string, () => Repositories]> = url
  ? [
      ['mémoire', memory],
      ['base', database],
    ]
  : [['mémoire', memory]]

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000'
const MALFORMED_ID = 'pas-un-uuid'
const UNKNOWN_CONTENT_ID = 999_999
const [FIRST, SECOND] = CONTENT.exercises
const TRACK = CONTENT.tracks[0]!
const OTHER_TRACK = CONTENT.tracks[1]!
const day = (n: number): Date => new Date(`2026-11-0${n}T10:00:00Z`)
const account = { email: 'Ada@Example.org', passwordHash: '$argon2id$v=19$hash' }

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

describe.each(BACKENDS)('dépôt des comptes (%s)', (_name, open) => {
  let users: UserRepository
  beforeEach(() => {
    users = open().users
  })

  it('crée un compte avec l’email en minuscules et une version de jeton à 0', async () => {
    const user = await users.create(account)

    expect(user).toEqual({
      id: expect.stringMatching(UUID),
      email: 'ada@example.org',
      passwordHash: account.passwordHash,
      tokenVersion: 0,
      createdAt: expect.any(Date),
    })
  })

  it('refuse un email déjà pris, quelle que soit sa casse', async () => {
    await users.create(account)

    expect(await users.create({ ...account, email: 'ADA@example.ORG' })).toBeNull()
  })

  it('retrouve un compte par son id ou son email, sans tenir compte de la casse', async () => {
    const user = await users.create(account)

    expect(await users.findById(user!.id)).toEqual(user)
    expect(await users.findByEmail('ADA@EXAMPLE.ORG')).toEqual(user)
  })

  it.each([
    ['inconnu', UNKNOWN_ID],
    ['mal formé', 'pas-un-uuid'],
  ])('répond null pour un id %s', async (_cas, id) => {
    expect(await users.findById(id)).toBeNull()
    expect(await users.incrementTokenVersion(id)).toBeNull()
  })

  it('répond null pour un email inconnu', async () => {
    expect(await users.findByEmail('personne@example.org')).toBeNull()
  })

  it('incrémente la version de jeton à chaque révocation', async () => {
    const user = await users.create(account)

    expect(await users.incrementTokenVersion(user!.id)).toBe(1)
    expect(await users.incrementTokenVersion(user!.id)).toBe(2)
    expect((await users.findById(user!.id))?.tokenVersion).toBe(2)
  })
})

describe.each(BACKENDS)('dépôt de la progression (%s)', (_name, open) => {
  let repos: Repositories
  let userId: string
  beforeEach(async () => {
    repos = open()
    userId = (await repos.users.create(account))!.id
  })

  it('compte une première soumission ratée', async () => {
    expect(await repos.progress.recordAttempt(userId, FIRST!.id, false, day(1))).toEqual({
      userId,
      exerciseId: FIRST!.id,
      attempts: 1,
      firstPassedAt: null,
      lastAttemptAt: day(1),
    })
  })

  it('date la première réussite et la garde après un échec ou une autre réussite', async () => {
    await repos.progress.recordAttempt(userId, FIRST!.id, false, day(1))
    await repos.progress.recordAttempt(userId, FIRST!.id, true, day(2))
    await repos.progress.recordAttempt(userId, FIRST!.id, true, day(3))
    const last = await repos.progress.recordAttempt(userId, FIRST!.id, false, day(4))

    expect(last).toEqual({
      userId,
      exerciseId: FIRST!.id,
      attempts: 4,
      firstPassedAt: day(2),
      lastAttemptAt: day(4),
    })
    expect(await repos.progress.findProgress(userId, FIRST!.id)).toEqual(last)
  })

  it('répond null pour un exercice jamais soumis', async () => {
    expect(await repos.progress.findProgress(userId, FIRST!.id)).toBeNull()
  })

  it('répond null ou [] pour un id d’apprenant mal formé', async () => {
    expect(await repos.progress.findProgress(MALFORMED_ID, FIRST!.id)).toBeNull()
    expect(await repos.progress.listProgress(MALFORMED_ID)).toEqual([])
  })

  it.each([
    ['un apprenant inconnu', () => UNKNOWN_ID, () => FIRST!.id],
    ['un apprenant mal formé', () => MALFORMED_ID, () => FIRST!.id],
    ['un exercice inconnu', (id: string) => id, () => UNKNOWN_CONTENT_ID],
  ])('refuse une soumission pour %s', async (_cas, user, exercise) => {
    await expect(
      repos.progress.recordAttempt(user(userId), exercise(), true, day(1)),
    ).rejects.toBeInstanceOf(UnknownReferenceError)
  })

  it('liste la progression d’un apprenant par exercice, sans celle des autres', async () => {
    const other = (await repos.users.create({ ...account, email: 'grace@example.org' }))!.id
    await repos.progress.recordAttempt(userId, SECOND!.id, true, day(1))
    await repos.progress.recordAttempt(other, FIRST!.id, true, day(1))
    await repos.progress.recordAttempt(userId, FIRST!.id, false, day(2))

    const list = await repos.progress.listProgress(userId)

    expect(list.map((p) => [p.exerciseId, p.firstPassedAt])).toEqual(
      [
        [FIRST!.id, null],
        [SECOND!.id, day(1)],
      ].toSorted((a, b) => (a[0] as number) - (b[0] as number)),
    )
  })
})

describe.each(BACKENDS)('dépôt des certificats (%s)', (_name, open) => {
  let repos: Repositories
  let userId: string
  const request = (code: string, trackId = TRACK.id, issuedAt = day(1)) => ({
    code,
    userId,
    trackId,
    holderName: 'Ada Lovelace',
    issuedAt,
  })
  beforeEach(async () => {
    repos = open()
    userId = (await repos.users.create(account))!.id
  })

  it('délivre un certificat retrouvé par son code public', async () => {
    const issued = await repos.certificates.issue(request('ABC123'))

    expect(issued).toEqual({ id: expect.any(Number), ...request('ABC123') })
    expect(await repos.certificates.findByCode('ABC123')).toEqual(issued)
  })

  it('redemandé pour le même parcours, renvoie le certificat déjà délivré', async () => {
    const first = await repos.certificates.issue(request('ABC123'))

    expect(await repos.certificates.issue(request('XYZ789', TRACK.id, day(2)))).toEqual(first)
    expect(await repos.certificates.findByCode('XYZ789')).toBeNull()
  })

  it('refuse un code déjà attribué à un autre certificat', async () => {
    await repos.certificates.issue(request('ABC123'))

    await expect(repos.certificates.issue(request('ABC123', OTHER_TRACK.id))).rejects.toThrow()
  })

  it('répond null pour un code inconnu', async () => {
    expect(await repos.certificates.findByCode('INCONNU')).toBeNull()
  })

  it('répond [] pour un id d’apprenant mal formé', async () => {
    expect(await repos.certificates.listCertificates(MALFORMED_ID)).toEqual([])
  })

  it.each([
    ['un apprenant inconnu', { userId: UNKNOWN_ID }],
    ['un apprenant mal formé', { userId: MALFORMED_ID }],
    ['un parcours inconnu', { trackId: UNKNOWN_CONTENT_ID }],
  ])('refuse un certificat pour %s', async (_cas, override) => {
    await expect(
      repos.certificates.issue({ ...request('ABC123'), ...override }),
    ).rejects.toBeInstanceOf(UnknownReferenceError)
  })

  it.each(['', '   '])('refuse un certificat au nom vide (%j)', async (holderName) => {
    await expect(
      repos.certificates.issue({ ...request('ABC123'), holderName }),
    ).rejects.toBeInstanceOf(InvalidHolderNameError)
    expect(await repos.certificates.findByCode('ABC123')).toBeNull()
  })

  it('liste les certificats d’un apprenant du plus ancien au plus récent', async () => {
    await repos.certificates.issue(request('B', OTHER_TRACK.id, day(2)))
    await repos.certificates.issue(request('A', TRACK.id, day(1)))

    const list = await repos.certificates.listCertificates(userId)

    expect(list.map((c) => c.code)).toEqual(['A', 'B'])
  })
})

describe.skipIf(!url)('tables apprenant : base contre mémoire', () => {
  // Les ids et dates de création viennent de la base : seul le reste est comparé.
  async function scenario(repos: Repositories): Promise<unknown> {
    const user = (await repos.users.create(account))!
    const duplicate = await repos.users.create({ ...account, email: 'ADA@EXAMPLE.ORG' })
    const version = await repos.users.incrementTokenVersion(user.id)
    await repos.progress.recordAttempt(user.id, FIRST!.id, false, day(1))
    await repos.progress.recordAttempt(user.id, FIRST!.id, true, day(2))
    await repos.progress.recordAttempt(user.id, SECOND!.id, false, day(3))
    await repos.certificates.issue({
      code: 'C1',
      userId: user.id,
      trackId: TRACK.id,
      holderName: 'Ada',
      issuedAt: day(4),
    })
    const strip = <T extends { userId: string }>({ userId: _, ...rest }: T) => rest
    return {
      duplicate,
      version,
      found: (await repos.users.findByEmail(account.email))?.email,
      progress: (await repos.progress.listProgress(user.id)).map(strip),
      certificates: (await repos.certificates.listCertificates(user.id)).map(({ id: _, ...rest }) =>
        strip(rest),
      ),
    }
  }

  it('même réponse pour un parcours d’apprenant complet', async () => {
    const fromDatabase = await scenario(database())
    expect(fromDatabase).toEqual(await scenario(memory()))
  })

  it('la base refuse un email qui n’est pas en minuscules', async () => {
    await expect(
      prisma.user.create({ data: { email: 'Ada@example.org', passwordHash: 'x' } }),
    ).rejects.toThrow()
  })

  it('la base refuse une version de jeton négative', async () => {
    await expect(
      prisma.user.create({
        data: { email: 'ada@example.org', passwordHash: 'x', tokenVersion: -1 },
      }),
    ).rejects.toThrow()
  })

  it('la base refuse une progression sans soumission', async () => {
    const user = await prisma.user.create({ data: { email: 'ada@example.org', passwordHash: 'x' } })
    await expect(
      prisma.exerciseProgress.create({
        data: { userId: user.id, exerciseId: FIRST!.id, attempts: 0, lastAttemptAt: day(1) },
      }),
    ).rejects.toThrow()
  })

  it('la base refuse un certificat sans nom', async () => {
    const user = await prisma.user.create({ data: { email: 'ada@example.org', passwordHash: 'x' } })
    await expect(
      prisma.certificate.create({
        data: { code: 'C', userId: user.id, trackId: TRACK.id, holderName: '  ', issuedAt: day(1) },
      }),
    ).rejects.toThrow()
  })

  it('supprimer un compte supprime sa progression et ses certificats', async () => {
    const repos = database()
    const user = (await repos.users.create(account))!
    await repos.progress.recordAttempt(user.id, FIRST!.id, true, day(1))
    await repos.certificates.issue({
      code: 'C',
      trackId: TRACK.id,
      userId: user.id,
      holderName: 'Ada',
      issuedAt: day(1),
    })

    await prisma.user.delete({ where: { id: user.id } })

    expect(await prisma.exerciseProgress.count()).toBe(0)
    expect(await prisma.certificate.count()).toBe(0)
  })

  it('réinjecter le contenu vide la progression et les certificats', async () => {
    const repos = database()
    const user = (await repos.users.create(account))!
    await repos.progress.recordAttempt(user.id, FIRST!.id, true, day(1))
    await repos.certificates.issue({
      code: 'C',
      userId: user.id,
      trackId: TRACK.id,
      holderName: 'Ada',
      issuedAt: day(1),
    })

    await seedDatabase(prisma)

    expect(await repos.users.findById(user.id)).not.toBeNull()
    expect(await repos.progress.listProgress(user.id)).toEqual([])
    expect(await repos.certificates.listCertificates(user.id)).toEqual([])
  })
})
