import { Router } from 'express'
import { SanteController } from '../controllers/sante.controller.ts'

export function construireRouteurSante(): Router {
  const routeur = Router()
  const controleur = new SanteController()

  routeur.get('/health', controleur.lire)

  return routeur
}
