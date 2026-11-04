import type { PrismaClient } from '@prisma/client'
import { execSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const backendDir = fileURLToPath(new URL('../../backend/', import.meta.url))

// La CLI Prisma coûte plusieurs secondes même sans rien à appliquer : on ne la lance que s'il manque une migration.
// Une migration déjà appliquée puis modifiée n'est donc pas signalée ici (`migrate deploy` la signalerait).
async function isMigrated(prisma: PrismaClient): Promise<boolean> {
  const expected = readdirSync(`${backendDir}prisma/migrations`, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
  try {
    const rows = await prisma.$queryRaw<{ migration_name: string }[]>`
      SELECT migration_name FROM _prisma_migrations
      WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`
    const applied = new Set(rows.map((row) => row.migration_name))
    return expected.every((name) => applied.has(name))
  } catch {
    return false
  }
}

export async function migrateTestDatabase(prisma: PrismaClient, url: string): Promise<void> {
  if (!(await isMigrated(prisma))) {
    execSync('npx prisma migrate deploy', {
      cwd: backendDir,
      env: { ...process.env, DATABASE_URL: url },
      stdio: 'ignore',
    })
  }
}
