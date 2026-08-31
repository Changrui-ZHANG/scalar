import { Router } from 'express'
import type { Config } from '../config/index.ts'
import { construireRouteurAuth } from './auth.routes.ts'
import { construireRouteurSante } from './sante.routes.ts'

export function construireRouteurApi(config: Config): Router {
  const routeur = Router()

  routeur.use(construireRouteurSante())
  routeur.use(construireRouteurAuth(config))

  return routeur
}
