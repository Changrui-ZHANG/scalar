import { createHmac } from 'node:crypto'
import type { NextFunction, Request, RequestHandler, Response } from 'express'
import {
  EN_TETE_TRANSFERT,
  LONGUEUR_PSEUDONYME,
  SAUTS_PROXY_DE_CONFIANCE,
  type IdentiteClient,
} from '@scalar/shared/proxy.ts'

// Hors de la requete : rien de ce qui est attache ici ne doit pouvoir partir
// dans une serialisation de reponse par inadvertance, et l'identite reste
// invisible a tout code qui ne demande pas explicitement a la lire.
const identites = new WeakMap<Request, IdentiteClient>()

function decouperChaine(brut: string | readonly string[] | undefined): readonly string[] {
  const texte = Array.isArray(brut) ? brut.join(',') : ((brut as string | undefined) ?? '')

  return texte
    .split(',')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
}

function pseudonymiser(valeur: string, secret: string): string {
  return createHmac('sha256', secret).update(valeur).digest('hex').slice(0, LONGUEUR_PSEUDONYME)
}

// L'entree retenue est celle que le dernier proxy de confiance a vue, comptee
// depuis la droite. Compter depuis la gauche rendrait l'identite fournie par le
// client : il suffirait d'envoyer son propre en-tete pour changer de seau.
export function resoudreIdentiteClient(
  enTeteTransfert: string | readonly string[] | undefined,
  secret: string,
): IdentiteClient {
  const sauts = decouperChaine(enTeteTransfert)

  if (sauts.length < SAUTS_PROXY_DE_CONFIANCE) {
    return { nature: 'interne' }
  }

  const valeur = sauts[sauts.length - SAUTS_PROXY_DE_CONFIANCE]

  if (valeur === undefined) {
    return { nature: 'interne' }
  }

  return { nature: 'publique', pseudonyme: pseudonymiser(valeur, secret) }
}

export function construireIdentiteClient(secret: string): RequestHandler {
  return (requete: Request, _reponse: Response, suivant: NextFunction): void => {
    // `requete.ips` depend de `trust proxy` et rendrait la borne implicite ;
    // l'en-tete brut garde la decision dans la fonction qui la declare. Son
    // nom vient du contrat : le rendu serveur propage la meme constante, et
    // deux orthographes divergentes feraient retomber tout appel en `interne`.
    identites.set(requete, resoudreIdentiteClient(requete.headers[EN_TETE_TRANSFERT], secret))
    suivant()
  }
}

// Absente si le middleware n'a pas tourne : une route qui lirait l'identite
// hors de la chaine doit echouer bruyamment, pas se voir offrir un defaut
// permissif.
export function lireIdentiteClient(requete: Request): IdentiteClient {
  const identite = identites.get(requete)

  if (identite === undefined) {
    throw new Error('L identite de client n a pas ete resolue pour cette requete.')
  }

  return identite
}
