import 'dotenv/config'
import express from 'express'
import { ExecutionController } from "./controller/index.ts"
import { isDatabaseUp, migrateDatabase } from "./db/index.ts"
import { logger } from "./logger.ts"
import { hasJavascriptRuntime } from "./services/execution.service.ts"

const app = express()
const PORT = Number(process.env.PORT ?? 3001)

app.use(express.json())

app.get('/api/v1', (_req, res) => {
  res.json({ status: 'ok', message: 'API Scalar (Backend)' })
})

app.get('/api/v1/health', async (_req, res) => {
  res.json({
    status: 'ok',
    database: (await isDatabaseUp()) ? 'connected' : 'disconnected',
  })
})

app.use('/api/v1/executions', new ExecutionController().buildRouter())

async function demarrer() {
  try {
    await migrateDatabase()
    logger.info('Base PostgreSQL connectée et migrée')
  } catch (err: unknown) {
    logger.error({ err }, 'Connexion ou migration PostgreSQL échouée')
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
      logger.info({ port: PORT }, 'Backend Express en écoute')
    })
  }
}

demarrer()

export const viteNodeApp = app
