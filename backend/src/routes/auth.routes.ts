import { Router } from 'express'
import { schemaInscription } from '@scalar/shared/inscription.ts'
import { AuthController } from '../controllers/auth.controller.ts'
import { valider } from '../middlewares/validation.middleware.ts'
import { AuthService } from '../services/auth.service.ts'
import { MotDePasseService } from '../services/mot-de-passe.service.ts'
import type { Config } from '../config/index.ts'

// `POST /accounts`, sous le prefixe `/api/v1` : une ressource au pluriel, et le
// compte est la chose que l'inscription cree. « inscriptions » aurait ete le
// mot du produit, mais c'est aussi celui du glossaire pour l'inscription a un
// Parcours — l'entite `Enrollment`, qui aura sa propre route.
//
// Le plafond sensible ne se monte pas ici : il est declare dans
// `shared/limites.ts` et applique par le premier maillon de la chaine, avant la
// session. Ce qui se monte par route, c'est la validation.
export function construireRouteurAuth(config: Config): Router {
  const routeur = Router()
  const valide = valider('corps', schemaInscription)

  const service = new AuthService(
    new MotDePasseService({
      memoireKiB: config.ARGON2_MEMOIRE_KIB,
      iterations: config.ARGON2_ITERATIONS,
      parallelisme: config.ARGON2_PARALLELISME,
    }),
  )

  const controleur = new AuthController(service, valide, config.NODE_ENV !== 'development')

  routeur.post('/accounts', valide.middleware, controleur.creerCompte)

  return routeur
}
