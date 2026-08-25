import { Router } from 'express'
import { construireRouteurSante } from './sante.routes.ts'

export function construireRouteurApi(): Router {
  const routeur = Router()

  routeur.use(construireRouteurSante())

  return routeur
}
