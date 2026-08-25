import express, { type Express } from 'express'
import { construireRouteurApi } from './routes/index.ts'
import { gestionErreur, routeIntrouvable } from './middlewares/erreur.middleware.ts'

export function construireApp(): Express {
  const app = express()

  app.use(express.json())
  app.use('/api/v1', construireRouteurApi())
  app.use(routeIntrouvable)
  app.use(gestionErreur)

  return app
}
