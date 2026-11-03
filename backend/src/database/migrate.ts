import { exec } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

export async function migrateDatabase(): Promise<void> {
  const backendDir = fileURLToPath(new URL('../../', import.meta.url))
  await execAsync('npx prisma migrate deploy', { cwd: backendDir })
}
