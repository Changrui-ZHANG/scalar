import type { RequestHandler } from 'express'
import { rateLimit } from 'express-rate-limit'
import type { AugmentedRequest } from 'express-rate-limit'
import { ErreurApi } from '@scalar/shared/erreurs.ts'
import { PLAFOND_DEFAUT } from '@scalar/shared/limites.ts'
import type { Plafond } from '@scalar/shared/limites.ts'
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
