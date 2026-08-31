import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { ErreurApi } from '@scalar/shared/erreurs.ts'

// Le front et l'API sont servis sous une seule origine : le controle tient donc
// en une comparaison entre l'en-tete `Origin` et l'origine que la requete
// elle-meme a atteinte. Rien a configurer, rien a maintenir a jour, et aucune
// liste d'origines autorisees a laisser deriver.
//
// Ce n'est pas la defense CSRF complete que la decision d'architecture demande
// — elle exige aussi un jeton, qui est reporte. C'est la moitie presque gratuite
// et elle bloque le cas qui compte : un formulaire poste depuis un autre site.

// Les methodes que la specification HTTP dit sures. Elles ne changent rien, donc
// une origine etrangere n'a rien a y gagner ; les plafonner ici ferait echouer
// toute navigation entrante legitime.
const METHODES_SURES = new Set(['GET', 'HEAD', 'OPTIONS'])

export function origineDeLaRequete(requete: Request): string | undefined {
  const hote = requete.get('host')

  return hote === undefined ? undefined : `${requete.protocol}://${hote.toLowerCase()}`
}

export function construireOrigine(): RequestHandler {
  return (requete: Request, _reponse: Response, suivant: NextFunction): void => {
    if (METHODES_SURES.has(requete.method.toUpperCase())) {
      suivant()

      return
    }

    const annoncee = requete.get('origin')

    // En-tete absente : ce n'est pas un navigateur qui poste depuis une page,
    // c'est un appel direct — rendu serveur, sonde, client en ligne de
    // commande. Refuser ici casserait le rendu serveur sans rien fermer : un
    // site tiers, lui, ne peut pas omettre cette en-tete.
    if (annoncee === undefined) {
      suivant()

      return
    }

    // `Origin: null` est ce qu'envoie un document sans origine — bac a sable,
    // redirection inter-sites. Il ne peut jamais valoir l'origine servie, donc
    // il tombe dans le refus par la comparaison, sans cas particulier.
    if (annoncee === origineDeLaRequete(requete)) {
      suivant()

      return
    }

    suivant(new ErreurApi('ORIGINE_REFUSEE'))
  }
}
