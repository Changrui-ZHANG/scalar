// Seul chemin vers le role admin : l'API publique ne le donne jamais.
// Usage : npm run admin:promote -- ada@example.org (le compte doit deja exister).
import 'dotenv/config'

import { logger } from '../logger.ts'
import { PrismaUserRepository } from '../repository/prisma-user.repository.ts'
import { prisma } from './client.ts'

const email = process.argv[2]

try {
  if (!email) {
    throw new Error('Email manquant : npm run admin:promote -- <email>')
  }
  const user = await new PrismaUserRepository(prisma).promoteToAdmin(email)
  if (!user) {
    throw new Error(`Aucun compte inscrit avec l'email ${email}`)
  }
  logger.info({ email: user.email }, 'Compte promu admin')
} catch (err: unknown) {
  logger.error({ err }, 'Promotion admin refusée ou échouée')
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
