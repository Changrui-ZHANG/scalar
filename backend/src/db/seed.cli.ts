/**
 * `npm run db:seed` : recharge le contenu de la base depuis les donnees du depot.
 * Remplace tout le contenu existant (voir `seed.ts`).
 */
import 'dotenv/config'

import { logger } from '../logger.ts'
import { prisma } from './index.ts'
import { seedDatabase } from './seed.ts'

try {
  await seedDatabase(prisma)
  logger.info('Contenu chargé dans la base')
} catch (err: unknown) {
  logger.error({ err }, 'Chargement du contenu refusé ou échoué')
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
