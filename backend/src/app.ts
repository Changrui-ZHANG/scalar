import express, { type Express } from 'express'
import type { Config } from './config/index.ts'
import { SAUTS_PROXY_DE_CONFIANCE } from '@scalar/shared/proxy.ts'
import { TAILLE_MAX_CORPS } from '@scalar/shared/limites.ts'
import { construireRouteurApi } from './routes/index.ts'
import { interdireCacheIntermediaire } from './middlewares/cache.middleware.ts'
import { construireIdentiteClient } from './middlewares/identite-client.middleware.ts'
import { assemblerChaine } from './middlewares/chaine.ts'
import { construireDebitParRoute } from './middlewares/debit.middleware.ts'
import { construireOrigine } from './middlewares/origine.middleware.ts'
import { construireSession } from './middlewares/session.middleware.ts'
import { gestionErreur, routeIntrouvable } from './middlewares/erreur.middleware.ts'

export function construireApp(config: Config): Express {
  const app = express()

  // Borne, jamais `true` : sans elle Express retiendrait l'en-tete le plus a
  // gauche, donc celui que le client controle.
  app.set('trust proxy', SAUTS_PROXY_DE_CONFIANCE)
  app.disable('x-powered-by')

  // Aucun middleware CORS n'est monte, et c'est l'invariant : le front et l'API
  // sont servis sous une seule origine, `/api/v1` est un chemin. Le besoin d'en
  // ajouter un signalerait que l'origine unique a ete perdue.
  app.use(interdireCacheIntermediaire)

  // Avant tout traitement, et avant meme la chaine : une methode non sure
  // venue d'un autre site n'a pas a faire lire son corps ni consommer un seau
  // de plafond. Ce n'est pas un maillon de la chaine d'autorisation — il ne
  // decide d'aucun acces, il refuse une provenance.
  app.use(construireOrigine())
  app.use(construireIdentiteClient(config.SECRET_PSEUDONYMISATION))

  // La chaine d'autorisation. `assemblerChaine` leve si l'ordre monte
  // n'est pas une sous-sequence de l'ordre declare : le demarrage echoue ici,
  // avant que le port ne s'ouvre, plutot qu'a la premiere requete protegee.
  // `debit` choisit son seau selon la route atteinte, ce qui applique le
  // plafond sensible de l'inscription **avant** la session, comme la chaine
  // l'exige. `etatCompte` ne peut pas rejoindre ce montage global : il
  // refuserait l'inscription elle-meme.
  app.use(
    ...assemblerChaine([
      { nom: 'debit', middleware: construireDebitParRoute() },
      { nom: 'session', middleware: construireSession() },
    ]),
  )

  // Apres le plafond, pour qu'un corps ne soit pas lu au profit d'un appelant
  // deja hors plafond ; global et avant les routeurs, sous une taille declaree.
  app.use(express.json({ limit: TAILLE_MAX_CORPS }))
  app.use('/api/v1', construireRouteurApi(config))
  app.use(routeIntrouvable)
  app.use(gestionErreur)

  return app
}
