import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { etatSuffit, type EtatCompte } from '@scalar/shared/compte.ts'
import { ErreurApi } from '@scalar/shared/erreurs.ts'
import { lirePrincipal } from './session.middleware.ts'

// Troisieme maillon de la chaine, entre `session` et `role`. Son `code` de
// refus est **distinct** de celui d'un refus de role, parce que les deux
// n'appellent pas la meme suite : verifier son adresse d'un cote, prendre un
// abonnement de l'autre. Les confondre servirait a l'apprenant non verifie une
// invitation a payer.
//
// Ce maillon ne se monte pas globalement : il refuserait l'inscription
// elle-meme, faite par un visiteur qui n'a pas encore de compte.
export function construireEtatCompte(minimum: EtatCompte): RequestHandler {
  return (requete: Request, _reponse: Response, suivant: NextFunction): void => {
    const principal = lirePrincipal(requete)

    // Refus par defaut. Un principal absent n'est pas « un etat inconnu qu'on
    // laisse passer » : c'est un visiteur anonyme sur une route qui exige un
    // etat de compte, donc un refus — servi sans `etatCourant`, parce qu'il
    // n'y en a pas et qu'en inventer un serait servir du faux.
    if (principal === undefined) {
      suivant(new ErreurApi('ETAT_COMPTE_INSUFFISANT', { details: { etatExige: minimum } }))

      return
    }

    if (!etatSuffit(principal.accountState, minimum)) {
      suivant(
        new ErreurApi('ETAT_COMPTE_INSUFFISANT', {
          details: { etatCourant: principal.accountState, etatExige: minimum },
        }),
      )

      return
    }

    suivant()
  }
}
