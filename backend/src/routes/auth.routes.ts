import { Router } from 'express'
import { schemaInscription } from '@scalar/shared/inscription.ts'
import { schemaConnexion } from '@scalar/shared/connexion.ts'
import { AuthController } from '../controllers/auth.controller.ts'
import { valider } from '../middlewares/validation.middleware.ts'
import { AuthService } from '../services/auth.service.ts'
import { MotDePasseService } from '../services/mot-de-passe.service.ts'
import type { Config } from '../config/index.ts'

// `POST /accounts`, sous le prefixe `/api/v1` : creation de compte.
// `POST /sessions`, `DELETE /sessions`, `GET /sessions/current` : cycle de vie des sessions.
//
// Le plafond sensible ne se monte pas ici : il est declare dans
// `shared/limites.ts` et applique par le premier maillon de la chaine, avant la
// session. Ce qui se monte par route, c'est la validation.
export function construireRouteurAuth(config: Config): Router {
  const routeur = Router()
  const valideInscription = valider('corps', schemaInscription)
  const valideConnexion = valider('corps', schemaConnexion)

  const service = new AuthService(
    new MotDePasseService({
      memoireKiB: config.ARGON2_MEMOIRE_KIB,
      iterations: config.ARGON2_ITERATIONS,
      parallelisme: config.ARGON2_PARALLELISME,
    }),
  )

  const controleur = new AuthController(
    service,
    valideInscription,
    valideConnexion,
    config.NODE_ENV !== 'development',
  )

  routeur.post('/accounts', valideInscription.middleware, controleur.creerCompte)
  routeur.post('/sessions', valideConnexion.middleware, controleur.connecter)
  routeur.delete('/sessions', controleur.deconnecter)
  routeur.get('/sessions/current', controleur.obtenirSessionCourante)

  return routeur
}
