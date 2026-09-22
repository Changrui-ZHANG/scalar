import 'dotenv/config'
import express from 'express'
import mongoose from 'mongoose'
import { ExecutionController } from "./controller/index.ts"
import { logger } from "./logger.ts"
import { hasJavascriptRuntime } from "./services/execution.service.ts"

const app = express()
const PORT = Number(process.env.PORT ?? 3001)
const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/scalar'

app.use(express.json())

app.get('/api/v1', (_req, res) => {
  res.json({ status: 'ok', message: 'API Scalar (Backend)' })
})

app.get('/api/v1/health', (_req, res) => {
  res.json({
    status: 'ok',
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  })
})

app.use('/api/v1/executions', new ExecutionController().buildRouter())

async function demarrer() {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI)
      logger.info('Connecté à MongoDB avec succès')
    }
  } catch (err: unknown) {
    logger.error({ err }, 'Connexion MongoDB échouée')
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
