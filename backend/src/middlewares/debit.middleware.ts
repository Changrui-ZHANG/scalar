import type { RequestHandler } from 'express'
import { rateLimit } from 'express-rate-limit'
import type { AugmentedRequest } from 'express-rate-limit'
import { ErreurApi } from '@scalar/shared/erreurs.ts'
import { PLAFOND_DEFAUT, PLAFONDS_PAR_ROUTE } from '@scalar/shared/limites.ts'
import type { Plafond, PlafondDeRoute } from '@scalar/shared/limites.ts'
import { lireIdentiteClient } from './identite-client.middleware.ts'

// Seul middleware de limitation de debit du backend, premier maillon de
// la chaine — donc avant toute session, et avant le parseur de corps : un
// appelant deja au-dela de son plafond ne fait pas lire son corps.
//
// La cle est un pseudonyme, jamais une adresse : le compteur est un
// ecrit, et une adresse en clair n'a pas le droit d'y figurer.
export function construireDebit(plafond: Plafond = PLAFOND_DEFAUT): RequestHandler {
  return rateLimit({
    windowMs: plafond.fenetreMs,
    limit: plafond.maximum,
    standardHeaders: 'draft-8',
    legacyHeaders: false,

    // Un appel qui n'a traverse aucun proxy de confiance est interne et
    // echappe aux plafonds anonymes. Sans cette exemption, tout le
    // rendu serveur partagerait un seul seau.
    skip: (requete) => lireIdentiteClient(requete).nature === 'interne',

    keyGenerator: (requete) => {
      const identite = lireIdentiteClient(requete)

      // `skip` a deja ecarte le cas interne ; la branche existe parce que le
      // type la porte, et retomber sur une cle constante serait le bug que
      // l'exemption evite.
      if (identite.nature === 'interne') {
        throw new Error('Le plafond ne s applique pas a une identite interne.')
      }

      return identite.pseudonyme
    },

    // La cle ne derive pas d'une adresse : le repli IPv6 du generateur par
    // defaut n'a rien a valider ici.
    validate: { keyGeneratorIpFallback: false },

    // Le depassement est une reponse comme une autre : elle sort du catalogue,
    // par le terminal, et nomme le moment de la reinitialisation plutot que de
    // laisser deviner quand reessayer.
    handler: (requete, _reponse, suivant) => {
      // Le paquet n'augmente pas le type `Request` d'Express : il expose
      // `AugmentedRequest` pour cet acces, et l'index reste optionnel sous
      // `noUncheckedIndexedAccess`. Les replis retombent sur le plafond
      // declare, jamais sur une valeur inventee.
      const info = (requete as AugmentedRequest)['rateLimit']
      const annonce = info?.resetTime

      // Un magasin externe peut rendre une date corrompue : `toISOString` y
      // leverait un RangeError, et le 429 deviendrait un 500.
      const reinitialisation =
        annonce instanceof Date && !Number.isNaN(annonce.getTime())
          ? annonce
          : new Date(Date.now() + plafond.fenetreMs)

      // `legacyHeaders: false` et ce handler remplacent la reponse par defaut
      // du paquet : sans cette ligne, le seul endroit ou l'instant de reprise
      // existe est un champ proprietaire de `details`.
      _reponse.set(
        'Retry-After',
        String(Math.max(1, Math.ceil((reinitialisation.getTime() - Date.now()) / 1000))),
      )

      suivant(
        new ErreurApi('DEBIT_DEPASSE', {
          details: {
            maximum: info?.limit ?? plafond.maximum,
            fenetreSecondes: Math.round(plafond.fenetreMs / 1000),
            reinitialisationA: reinitialisation.toISOString(),
          },
        }),
      )
    },
  })
}

// Chemin d'une requete sans sa chaine de requete, et sans barre finale hors
// racine : `/api/v1/accounts?x=1`, `/api/v1/accounts/` et `/api/v1/accounts`
// designent la meme route, et trois ecritures d'un meme chemin ne doivent pas
// donner trois seaux dont deux echappent au plafond sensible.
export function cheminDeRoute(url: string): string {
  const sansRequete = url.split('?')[0] ?? ''
  const nettoye = sansRequete.length > 1 ? sansRequete.replace(/\/+$/, '') : sansRequete

  return nettoye.toLowerCase()
}

// Le maillon `debit` reellement monte. Il reste **unique** — un seul maillon
// dans la chaine, un seul endroit qui plafonne — mais il choisit son seau selon
// la route atteinte.
//
// C'est une substitution, jamais un cumul : une route sensible consomme son
// seau et **pas** celui par defaut. Monter un second maillon `debit` sur la
// route aurait double le decompte sur exactement les routes qu'on veut
// resserrer, et l'aurait applique **apres** `session`, alors que le plafond
// doit tomber avant elle, sur les surfaces anonymes.
export function construireDebitParRoute(
  routes: readonly PlafondDeRoute[] = PLAFONDS_PAR_ROUTE,
  defaut: Plafond = PLAFOND_DEFAUT,
): RequestHandler {
  const parDefaut = construireDebit(defaut)

  // Un limiteur par route declaree, construit au montage : `express-rate-limit`
  // tient son compteur dans la fermeture, donc en construire un par requete
  // remettrait le seau a zero a chaque appel.
  const sensibles = routes.map((route) => ({
    methode: route.methode.toUpperCase(),
    chemin: cheminDeRoute(route.chemin),
    middleware: construireDebit(route.plafond),
  }))

  return (requete, reponse, suivant) => {
    const chemin = cheminDeRoute(requete.originalUrl)
    const methode = requete.method.toUpperCase()
    const choisi = sensibles.find(
      (route) => route.methode === methode && route.chemin === chemin,
    )

    ;(choisi?.middleware ?? parDefaut)(requete, reponse, suivant)
  }
}
