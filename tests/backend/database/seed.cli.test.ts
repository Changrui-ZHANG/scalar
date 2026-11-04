import { PrismaClient } from '@prisma/client'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { migrateTestDatabase } from '../database.fixtures.ts'
import { CONTENT, seedDatabase } from '../../../backend/src/database/seed.ts'

// Vide la base : jamais DATABASE_URL, toujours la base de test.
const url = process.env.DATABASE_URL_TEST
const prisma = new PrismaClient({ datasourceUrl: url })
const backendDir = fileURLToPath(new URL('../../../backend/', import.meta.url))
const EXERCISE = CONTENT.exercises[0]!

function runSeedCli(...args: string[]) {
  const result = spawnSync(process.execPath, ['src/database/seed.cli.ts', ...args], {
    cwd: backendDir,
    env: { ...process.env, DATABASE_URL: url },
    encoding: 'utf8',
  })
  return { status: result.status, output: `${result.stdout}${result.stderr}` }
}

async function createLearnerWithProgress(): Promise<string> {
  const user = await prisma.user.create({ data: { email: 'ada@example.org', passwordHash: 'x' } })
  await prisma.exerciseProgress.create({
    data: { userId: user.id, exerciseId: EXERCISE.id, attempts: 1, lastAttemptAt: new Date() },
  })
  return user.id
}

beforeAll(async () => {
  await migrateTestDatabase(prisma, url!)
  await seedDatabase(prisma)
}, 60_000)

beforeEach(async () => {
  await prisma.$executeRawUnsafe('DELETE FROM users')
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe.skipIf(!url)('npm run db:seed', () => {
  it('charge le contenu quand aucun compte n’existe', () => {
    expect(runSeedCli().status).toBe(0)
  }, 30_000)

  it('refuse d’effacer la progression des comptes existants, sans rien toucher', async () => {
    const userId = await createLearnerWithProgress()

    const { status, output } = runSeedCli()

    expect(status).toBe(1)
    expect(output).toMatch(/--force/)
    expect(await prisma.exerciseProgress.count({ where: { userId } })).toBe(1)
  }, 30_000)

  it('avec --force, recharge le contenu et efface la progression', async () => {
    const userId = await createLearnerWithProgress()

    expect(runSeedCli('--force').status).toBe(0)
    expect(await prisma.user.count({ where: { id: userId } })).toBe(1)
    expect(await prisma.exerciseProgress.count()).toBe(0)
  }, 30_000)
})
