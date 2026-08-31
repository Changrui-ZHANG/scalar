import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { NOM_COOKIE_SESSION, type Principal } from '@scalar/shared/session.ts'
import { SessionService } from '../services/session.service.ts'

// Hors de la requete, comme l'identite de client : rien de ce qui est attache
// ici ne doit pouvoir partir dans une serialisation de reponse par inadvertance.
const principaux = new WeakMap<Request, Principal>()

// Ce maillon **resout**, il ne refuse pas. Une requete sans session valide
// continue avec un principal absent, et ce sont les maillons `etatCompte` et
// `role` qui tranchent — c'est ce qui permet de le monter globalement sans
// fermer l'inscription, faite par un visiteur qui n'a pas encore de compte.

// Express 5 n'analyse pas les cookies et le produit n'en pose que deux : un
// decoupage sur `;` puis sur le premier `=` suffit, et evite une dependance
// pour une seule en-tete. Aucun decodage percent : le jeton est en base64url,
// un alphabet qui n'en demande aucun.
export function lireCookie(enTete: string | undefined, nom: string): string | undefined {
  if (enTete === undefined) {
    return undefined
  }

  for (const morceau of enTete.split(';')) {
    const separateur = morceau.indexOf('=')

    if (separateur === -1) {
      continue
    }

    if (morceau.slice(0, separateur).trim() === nom) {
      const valeur = morceau.slice(separateur + 1).trim()

      return valeur.replace(/^"(.*)"$/, '$1')
    }
  }

  return undefined
}

export function construireSession(service: SessionService = new SessionService()): RequestHandler {
  return (requete: Request, _reponse: Response, suivant: NextFunction): void => {
    const jeton = lireCookie(requete.headers.cookie, NOM_COOKIE_SESSION)

    if (jeton === undefined || jeton === '') {
      suivant()

      return
    }

    // Une panne de base ne doit pas devenir un acces accorde : l'erreur part au
    // terminal, qui la sert en 500, plutot que de laisser la requete continuer
    // sans principal — ce qu'un maillon suivant lirait comme « non connecte ».
    service
      .lire(jeton)
      .then((principal) => {
        if (principal !== undefined) {
          principaux.set(requete, principal)
        }

        suivant()
      })
      .catch(suivant)
  }
}

// Rend `undefined` quand aucune session valide n'a ete resolue. Contrairement a
// l'identite de client, l'absence n'est pas une faute de montage : elle est
// l'etat normal d'un visiteur anonyme.
export function lirePrincipal(requete: Request): Principal | undefined {
  return principaux.get(requete)
}
