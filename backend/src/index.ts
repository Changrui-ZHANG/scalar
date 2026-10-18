import 'dotenv/config'
import express from 'express'
import {
  ExecutionController,
  ExerciseController,
  LessonController,
  TrackController,
} from "./controller/index.ts"
import { isDatabaseUp, migrateDatabase, prisma } from "./db/index.ts"
import { isContentEmpty, seedDatabase } from "./db/seed.ts"
import { logger } from "./logger.ts"
import { InMemoryExerciseRepository } from "./repositories/exercise.repository.ts"
import { InMemoryLessonRepository } from "./repositories/lesson.repository.ts"
import {
  PrismaExerciseRepository,
  PrismaLessonRepository,
  PrismaTrackRepository,
} from "./repositories/prisma.repository.ts"
import { InMemoryTrackRepository } from "./repositories/track.repository.ts"
import { hasJavascriptRuntime } from "./services/execution.service.ts"
import { ExerciseService } from "./services/exercise.service.ts"
import { LessonService } from "./services/lesson.service.ts"
import { TrackService } from "./services/track.service.ts"

const app = express()
const PORT = Number(process.env.PORT ?? 3001)

/**
 * Source du contenu : la base par defaut ; `mock` sert les donnees fictives
 * en memoire, pour travailler sans PostgreSQL.
 */
const CONTENT_SOURCE = process.env.CONTENT_SOURCE === 'mock' ? 'mock' : 'database'

const repositories =
  CONTENT_SOURCE === 'mock'
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

app.use(express.json())

app.get('/api/v1', (_req, res) => {
  res.json({ status: 'ok', message: 'API Scalar (Backend)' })
})

app.get('/api/v1/health', async (_req, res) => {
  res.json({
    status: 'ok',
    content: CONTENT_SOURCE,
    database: (await isDatabaseUp()) ? 'connected' : 'disconnected',
  })
})

app.use('/api/v1/executions', new ExecutionController().buildRouter())
app.use(
  '/api/v1',
  new TrackController(
    new TrackService(repositories.tracks, repositories.lessons, repositories.exercises),
  ).buildRouter(),
)
app.use(
  '/api/v1',
  new LessonController(new LessonService(repositories.tracks, repositories.lessons)).buildRouter(),
)
app.use(
  '/api/v1',
  new ExerciseController(
    new ExerciseService(repositories.tracks, repositories.exercises),
  ).buildRouter(),
)

async function demarrer() {
  try {
    await migrateDatabase()
    logger.info('Base PostgreSQL connectée et migrée')

    // Depot fraichement clone : `docker compose up` doit suffire a obtenir un
    // site rempli, sans commande de seed a connaitre.
    if (CONTENT_SOURCE === 'database' && (await isContentEmpty(prisma))) {
      await seedDatabase(prisma)
      logger.info('Base vide : contenu initial chargé depuis les données du dépôt')
    }
  } catch (err: unknown) {
    logger.error({ err }, 'Connexion, migration ou chargement du contenu PostgreSQL échoué')
  }

  // L'image Piston n'embarque aucun langage : sans amorcage, le moteur demarre
  // et ne sait rien executer. Sans cet avertissement, l'oubli se manifeste plus
  // tard par des erreurs sans rapport apparent avec sa cause.
  if (!(await hasJavascriptRuntime())) {
    logger.warn(
      "Le moteur d'exécution n'expose aucun runtime JavaScript : les soumissions " +
        'échoueront. Voir README, section « Moteur d’exécution ».',
    )
  }

  if (process.env.NODE_ENV === 'production') {
    app.listen(PORT, () => {
      logger.info({ port: PORT, content: CONTENT_SOURCE }, 'Backend Express en écoute')
    })
  }
}

demarrer()

export const viteNodeApp = app
