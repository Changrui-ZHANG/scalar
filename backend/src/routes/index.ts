import { Router } from 'express'
import type { Config } from '../config/index.ts'
import { AuthController } from '../controllers/auth.controller.ts'
import { ExerciseController } from '../controllers/exercise.controller.ts'
import { SanteController } from '../controllers/sante.controller.ts'
import { AuthService } from '../services/auth.service.ts'
import { ExerciseService } from '../services/exercise.service.ts'
import { MotDePasseService } from '../services/mot-de-passe.service.ts'

// Racine de composition : construit les services et les controleurs, puis
// monte le routeur que chaque controleur assemble lui-meme. Le controleur
// decide de ses chemins et de ses middlewares de validation ; ce fichier ne
// decide que de l'ordre de montage et des dependances a construire.
export function construireRouteurApi(config: Config): Router {
  const routeur = Router()

  const serviceAuth = new AuthService(
    new MotDePasseService({
      memoireKiB: config.ARGON2_MEMOIRE_KIB,
      iterations: config.ARGON2_ITERATIONS,
      parallelisme: config.ARGON2_PARALLELISME,
    }),
  )

  routeur.use(new SanteController().buildRouter())
  routeur.use(new AuthController(serviceAuth, config.NODE_ENV !== 'development').buildRouter())
  routeur.use(new ExerciseController(new ExerciseService()).buildRouter())

  return routeur
}
