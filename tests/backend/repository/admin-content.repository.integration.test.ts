import { PrismaClient } from '@prisma/client'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { migrateTestDatabase } from '../database.fixtures.ts'
import { CONTENT, seedDatabase } from '../../../backend/src/database/seed.ts'
import type { AdminContentRepository } from '../../../backend/src/repository/admin-content.repository.ts'
import { InMemoryAdminContentRepository } from '../../../backend/src/repository/admin-content.repository.ts'
import { PrismaAdminContentRepository } from '../../../backend/src/repository/prisma-admin-content.repository.ts'
import { PrismaUserRepository } from '../../../backend/src/repository/prisma-user.repository.ts'
import type { UserRepository } from '../../../backend/src/repository/user.repository.ts'
import { InMemoryUserRepository } from '../../../backend/src/repository/user.repository.ts'

// Vide la base : jamais DATABASE_URL, toujours la base de test.
const url = process.env.DATABASE_URL_TEST
const prisma = new PrismaClient({ datasourceUrl: url })

interface Repositories {
  readonly content: AdminContentRepository
  readonly users: UserRepository
}

const BACKENDS: ReadonlyArray<readonly [string, () => Repositories]> = [
  [
    'mémoire',
    () => ({ content: new InMemoryAdminContentRepository(), users: new InMemoryUserRepository() }),
  ],
  ...(url
    ? [
        [
          'base',
          () => ({
            content: new PrismaAdminContentRepository(prisma),
            users: new PrismaUserRepository(prisma),
          }),
        ] as const,
      ]
    : []),
]

const TRACK = CONTENT.tracks[0]!
const CHAPTER_WITH_CONTENT = CONTENT.chapters.find(
  (c) => c.trackId === TRACK.id && CONTENT.lessons.some((l) => l.chapterId === c.id),
)!
const UNKNOWN = 999_999
const NEW_TRACK = {
  slug: 'python',
  name: 'Python',
  summary: 'Le serpent.',
  programmingLanguage: null,
  prerequisiteTrackId: null,
}
const NEW_CHAPTER = {
  slug: 'listes',
  level: 'advanced',
  title: 'Listes',
  summary: 'Des listes.',
} as const

const saved = <T>(outcome: { status: string; item?: T }): T => {
  if (outcome.status !== 'saved') {
    throw new Error(outcome.status)
  }
  return outcome.item!
}

beforeAll(async () => {
  if (url) {
    await migrateTestDatabase(prisma, url)
  }
}, 60_000)

beforeEach(async () => {
  if (url) {
    await prisma.user.deleteMany()
    await seedDatabase(prisma)
  }
}, 60_000)

afterAll(async () => {
  await prisma.$disconnect()
})

describe.each(BACKENDS)('contenu admin (%s)', (_name, open) => {
  let content: AdminContentRepository
  beforeEach(() => {
    ;({ content } = open())
  })

  it('liste tous les parcours, triés par position', async () => {
    const tracks = await content.listTracks()

    expect(tracks.map((t) => t.slug)).toEqual(
      CONTENT.tracks.toSorted((a, b) => a.position - b.position).map((t) => t.slug),
    )
  })

  it('crée un parcours en brouillon après les autres', async () => {
    const track = saved(await content.createTrack(NEW_TRACK))

    expect(track).toMatchObject({ ...NEW_TRACK, status: 'draft', firstPublishedAt: null })
    expect(track.position).toBe(Math.max(...CONTENT.tracks.map((t) => t.position)) + 1)
    expect(await content.findTrack(track.id)).toEqual(track)
  })

  it('refuse un slug déjà pris et un prérequis inconnu', async () => {
    expect(await content.createTrack({ ...NEW_TRACK, slug: TRACK.slug })).toEqual({
      status: 'slug-taken',
    })
    expect(await content.createTrack({ ...NEW_TRACK, prerequisiteTrackId: UNKNOWN })).toEqual({
      status: 'prerequisite-not-found',
    })
    expect(await content.updateTrack(TRACK.id, { prerequisiteTrackId: UNKNOWN })).toEqual({
      status: 'prerequisite-not-found',
    })
  })

  it('modifie un parcours, et ne trouve pas un parcours inconnu', async () => {
    const changes = { name: 'JavaScript moderne', status: 'archived' } as const

    expect(await content.updateTrack(TRACK.id, changes)).toMatchObject({ item: changes })
    expect(await content.updateTrack(UNKNOWN, changes)).toEqual({ status: 'not-found' })
  })

  it('ne supprime pas un parcours qui a des chapitres, supprime un parcours vide', async () => {
    const track = saved(await content.createTrack(NEW_TRACK))

    expect(await content.deleteTrack(TRACK.id)).toBe('in-use')
    expect(await content.deleteTrack(track.id)).toBe('deleted')
    expect(await content.deleteTrack(track.id)).toBe('not-found')
  })

  it('place un chapitre à la fin de son niveau, et l’y replace quand il en change', async () => {
    const lastOf = async (level: string) =>
      Math.max(
        0,
        ...(await content.listChapters(TRACK.id))
          .filter((c) => c.level === level)
          .map((c) => c.position),
      )
    const advanced = await lastOf('advanced')
    const created = saved(await content.createChapter(TRACK.id, NEW_CHAPTER))
    expect(created).toMatchObject({ position: advanced + 1, status: 'draft' })

    const ecosystem = await lastOf('ecosystem')
    const moved = saved(await content.updateChapter(TRACK.id, created.id, { level: 'ecosystem' }))
    expect(moved).toMatchObject({ level: 'ecosystem', position: ecosystem + 1 })

    const renamed = saved(await content.updateChapter(TRACK.id, created.id, { title: 'Tableaux' }))
    expect(renamed.position).toBe(moved.position)
  })

  it('refuse un slug de chapitre déjà pris dans le parcours, et un parcours inconnu', async () => {
    expect(
      await content.createChapter(TRACK.id, { ...NEW_CHAPTER, slug: CHAPTER_WITH_CONTENT.slug }),
    ).toEqual({ status: 'slug-taken' })
    expect(await content.createChapter(UNKNOWN, NEW_CHAPTER)).toEqual({ status: 'not-found' })
  })

  it('ne touche jamais un chapitre par un autre parcours que le sien', async () => {
    const other = CONTENT.tracks[1]!

    expect(await content.findChapter(other.id, CHAPTER_WITH_CONTENT.id)).toBeNull()
    expect(await content.updateChapter(other.id, CHAPTER_WITH_CONTENT.id, { title: 'X' })).toEqual({
      status: 'not-found',
    })
    expect(await content.deleteChapter(other.id, CHAPTER_WITH_CONTENT.id)).toBe('not-found')
  })

  it('ne supprime pas un chapitre qui a des leçons, supprime un chapitre vide', async () => {
    const created = saved(await content.createChapter(TRACK.id, NEW_CHAPTER))

    expect(await content.deleteChapter(TRACK.id, CHAPTER_WITH_CONTENT.id)).toBe('in-use')
    expect(await content.deleteChapter(TRACK.id, created.id)).toBe('deleted')
  })
})

describe.each(BACKENDS)('promotion admin (%s)', (_name, open) => {
  it('promeut un compte inscrit, quelle que soit la casse de l’email', async () => {
    const { users } = open()
    await users.create({ email: 'ada@example.org', passwordHash: '$argon2id$hash' })

    expect(await users.promoteToAdmin('Ada@Example.org')).toMatchObject({ role: 'admin' })
    expect((await users.findByEmail('ada@example.org'))?.role).toBe('admin')
  })

  it('ne promeut ni un email inconnu, ni donc un apprenant anonyme', async () => {
    const { users } = open()
    const anonymous = await users.createAnonymous()

    expect(await users.promoteToAdmin('personne@example.org')).toBeNull()
    expect((await users.findById(anonymous.id))?.role).toBe('learner')
  })
})

describe.runIf(url)('contrainte de la table users', () => {
  it('refuse un admin sans compte', async () => {
    await expect(prisma.user.create({ data: { role: 'admin' } })).rejects.toThrow(
      /users_admin_has_account/,
    )
  })
})
