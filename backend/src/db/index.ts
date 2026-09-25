import { PrismaClient } from '@prisma/client'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

const execAsync = promisify(exec)

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgres://scalar:scalar@localhost:5433/scalar'
}

export const prisma = new PrismaClient()

/**
 * Applique les migrations au démarrage : un `docker compose up` sur un dépôt
 * fraîchement cloné doit suffire à obtenir une base au bon schéma.
 */
export async function migrateDatabase(): Promise<void> {
  const backendDir = fileURLToPath(new URL('../../', import.meta.url))
  await execAsync('npx prisma migrate deploy', { cwd: backendDir })
}

export async function isDatabaseUp(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch {
    return false
  }
}
