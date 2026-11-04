import { buildApp } from './app.ts'
import { config } from './config.ts'
import { isDatabaseUp, prisma } from './database/client.ts'
import { migrateDatabase } from './database/migrate.ts'
import { isContentEmpty, seedDatabase } from './database/seed.ts'
import { logger } from './logger.ts'
import { InMemoryExerciseRepository } from './repository/exercise.repository.ts'
import { InMemoryLessonRepository } from './repository/lesson.repository.ts'
import { PrismaExerciseRepository } from './repository/prisma-exercise.repository.ts'
import { PrismaLessonRepository } from './repository/prisma-lesson.repository.ts'
import { PrismaTrackRepository } from './repository/prisma-track.repository.ts'
import { InMemoryTrackRepository } from './repository/track.repository.ts'
import { hasJavascriptRuntime } from './service/execution.service.ts'

if (config.CONTENT_SOURCE === 'database' && !config.DATABASE_URL) {
  throw new Error('DATABASE_URL est obligatoire quand CONTENT_SOURCE=database.')
}

const repositories =
  config.CONTENT_SOURCE === 'mock'
    ? {
        tracks: new InMemoryTrackRepository(),
        exercises: new InMemoryExerciseRepository(),
        lessons: new InMemoryLessonRepository(),
      }
    : {
        tracks: new PrismaTrackRepository(prisma),
        exercises: new PrismaExerciseRepository(prisma),
        lessons: new PrismaLessonRepository(prisma),
      }

async function prepareDatabase(): Promise<void> {
  try {
    await migrateDatabase()
    logger.info('Base PostgreSQL connectée et migrée')

    if (config.SEED_ON_EMPTY && (await isContentEmpty(prisma))) {
      await seedDatabase(prisma)
      logger.info('Base vide : contenu initial chargé depuis les données du dépôt')
    }
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
  isDatabaseUp,
})

if (config.NODE_ENV === 'production') {
  viteNodeApp.listen(config.PORT, () => {
    logger.info({ port: config.PORT, content: config.CONTENT_SOURCE }, 'Backend Express en écoute')
  })
}
