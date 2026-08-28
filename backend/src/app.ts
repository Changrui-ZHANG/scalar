import express, { type Express } from 'express'
import type { Config } from './config/index.ts'
import { SAUTS_PROXY_DE_CONFIANCE } from './contracts/proxy.ts'
import { TAILLE_MAX_CORPS } from './contracts/limites.ts'
import { construireRouteurApi } from './routes/index.ts'
import { interdireCacheIntermediaire } from './middlewares/cache.middleware.ts'
import { construireIdentiteClient } from './middlewares/identite-client.middleware.ts'
import { assemblerChaine } from './middlewares/chaine.ts'
import { construireDebit } from './middlewares/debit.middleware.ts'
import { gestionErreur, routeIntrouvable } from './middlewares/erreur.middleware.ts'

export function construireApp(config: Config): Express {
  const app = express()

  // Borne, jamais `true` : sans elle Express retiendrait l'en-tete le plus a
  // gauche, donc celui que le client controle (AD-33).
  app.set('trust proxy', SAUTS_PROXY_DE_CONFIANCE)
  app.disable('x-powered-by')

  // Aucun middleware CORS n'est monte, et c'est l'invariant : le front et l'API
  // sont servis sous une seule origine, `/api/v1` est un chemin. Le besoin d'en
  // ajouter un signalerait que l'origine unique a ete perdue (AD-29).
  app.use(interdireCacheIntermediaire)
  app.use(construireIdentiteClient(config.SECRET_PSEUDONYMISATION))

  // La chaine d'autorisation (AD-5). `assemblerChaine` leve si l'ordre monte
  // n'est pas une sous-sequence de l'ordre declare : le demarrage echoue ici,
  // avant que le port ne s'ouvre, plutot qu'a la premiere requete protegee.
  app.use(...assemblerChaine([{ nom: 'debit', middleware: construireDebit() }]))

  // Apres le plafond, pour qu'un corps ne soit pas lu au profit d'un appelant
  // deja hors plafond ; global et avant les routeurs, sous une taille declaree
  // (AD-7).
  app.use(express.json({ limit: TAILLE_MAX_CORPS }))
  app.use('/api/v1', construireRouteurApi())
  app.use(routeIntrouvable)
  app.use(gestionErreur)

  return app
}
