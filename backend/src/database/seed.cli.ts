import 'dotenv/config'

import { logger } from '../logger.ts'
import { prisma } from './client.ts'
import { hasLearnerData, seedDatabase } from './seed.ts'

const force = process.argv.includes('--force')

try {
  if (!force && (await hasLearnerData(prisma))) {
    logger.error(
      'Seed refusé : la base contient des comptes ou des certificats, et le seed effacerait ' +
        'toute leur progression et tous leurs certificats. Relancer avec --force pour l’accepter ' +
        '(npm run db:seed --workspace backend -- --force).',
    )
    process.exitCode = 1
  } else {
    await seedDatabase(prisma)
    logger.info('Contenu chargé dans la base')
  }
} catch (err: unknown) {
  logger.error({ err }, 'Chargement du contenu refusé ou échoué')
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
