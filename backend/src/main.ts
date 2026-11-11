import { buildApp } from './app.ts'
import { config } from './config.ts'
import { isDatabaseUp, prisma } from './database/client.ts'
import { migrateDatabase } from './database/migrate.ts'
import { isContentEmpty, seedDatabase } from './database/seed.ts'
import { logger } from './logger.ts'
import { InMemoryAdminContentRepository } from './repository/admin-content.repository.ts'
import { InMemoryCertificateRepository } from './repository/certificate.repository.ts'
import { InMemoryExerciseRepository } from './repository/exercise.repository.ts'
import { InMemoryLessonRepository } from './repository/lesson.repository.ts'
import { InMemoryPlacementRepository } from './repository/placement.repository.ts'
import { PrismaAdminContentRepository } from './repository/prisma-admin-content.repository.ts'
import { PrismaCertificateRepository } from './repository/prisma-certificate.repository.ts'
import { PrismaExerciseRepository } from './repository/prisma-exercise.repository.ts'
import { PrismaLessonRepository } from './repository/prisma-lesson.repository.ts'
import { PrismaPlacementRepository } from './repository/prisma-placement.repository.ts'
import { PrismaProgressRepository } from './repository/prisma-progress.repository.ts'
import { PrismaQuestionnaireRepository } from './repository/prisma-questionnaire.repository.ts'
import { PrismaTrackRepository } from './repository/prisma-track.repository.ts'
import { PrismaUserRepository } from './repository/prisma-user.repository.ts'
import { InMemoryProgressRepository } from './repository/progress.repository.ts'
import { InMemoryQuestionnaireRepository } from './repository/questionnaire.repository.ts'
import { InMemoryTrackRepository } from './repository/track.repository.ts'
import { InMemoryUserRepository } from './repository/user.repository.ts'
import { ensureConfiguredAdmin } from './service/configured-admin.service.ts'
import { hasJavascriptRuntime } from './service/execution.service.ts'
import { Argon2PasswordHasher } from './service/password-hasher.service.ts'

if (config.CONTENT_SOURCE === 'database' && !config.DATABASE_URL) {
  throw new Error('DATABASE_URL est obligatoire quand CONTENT_SOURCE=database.')
}

const repositories =
  config.CONTENT_SOURCE === 'mock'
    ? {
        tracks: new InMemoryTrackRepository(),
        exercises: new InMemoryExerciseRepository(),
        lessons: new InMemoryLessonRepository(),
        questionnaire: new InMemoryQuestionnaireRepository(),
        placements: new InMemoryPlacementRepository(),
        users: new InMemoryUserRepository(),
        progress: new InMemoryProgressRepository(),
        certificates: new InMemoryCertificateRepository(),
        // Ses modifications restent invisibles de l'API publique : chaque depot a sa copie du contenu.
        adminContent: new InMemoryAdminContentRepository(),
      }
    : {
        tracks: new PrismaTrackRepository(prisma),
        exercises: new PrismaExerciseRepository(prisma),
        lessons: new PrismaLessonRepository(prisma),
        questionnaire: new PrismaQuestionnaireRepository(prisma),
        placements: new PrismaPlacementRepository(prisma),
        users: new PrismaUserRepository(prisma),
        progress: new PrismaProgressRepository(prisma),
        certificates: new PrismaCertificateRepository(prisma),
        adminContent: new PrismaAdminContentRepository(prisma),
      }

const hasher = new Argon2PasswordHasher()

async function prepareDatabase(): Promise<void> {
  try {
    await migrateDatabase()
    logger.info('Base PostgreSQL connectée et migrée')

    if (config.SEED_ON_EMPTY && (await isContentEmpty(prisma))) {
      await seedDatabase(prisma)
      logger.info('Base vide : contenu initial chargé depuis les données du dépôt')
    }

    await ensureConfiguredAdmin(repositories.users, hasher, {
      email: config.ADMIN_EMAIL,
      password: config.ADMIN_PASSWORD,
      nodeEnv: config.NODE_ENV,
    })
  } catch (err: unknown) {
    logger.error({ err }, 'Connexion, migration ou chargement du contenu PostgreSQL échoué')
  }
}

async function prepare(): Promise<void> {
  if (config.CONTENT_SOURCE === 'database') {
    await prepareDatabase()
  }

  if (!(await hasJavascriptRuntime())) {
    logger.warn(
      "Le moteur d'exécution n'expose aucun runtime JavaScript : les soumissions " +
        'échoueront. Voir README, section « Moteur d’exécution ».',
    )
  }
}

// Avant l'export : en dev, Vite ne sert aucune requete tant que la base n'est pas migree.
await prepare()

export const viteNodeApp = buildApp({
  ...repositories,
  contentSource: config.CONTENT_SOURCE,
  executionRateLimit: config.EXECUTION_RATE_LIMIT,
  learnerCreationRateLimit: config.LEARNER_CREATION_RATE_LIMIT,
  authAttemptsLimit: config.AUTH_ATTEMPTS_LIMIT,
  authIpAttemptsLimit: config.AUTH_IP_ATTEMPTS_LIMIT,
  authAccountAttemptsLimit: config.AUTH_ACCOUNT_ATTEMPTS_LIMIT,
  jwtSecret: config.JWT_SECRET,
  secureCookie: config.AUTH_COOKIE_SECURE,
  hasher,
  isDatabaseUp,
})

if (config.NODE_ENV === 'production') {
  viteNodeApp.listen(config.PORT, () => {
    logger.info({ port: config.PORT, content: config.CONTENT_SOURCE }, 'Backend Express en écoute')
  })
}
