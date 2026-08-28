import type { NextFunction, Request, Response } from 'express'
import { CODES_ERREUR, ErreurApi } from '../contracts/erreurs.ts'
import type { CodeErreur, CorpsErreur } from '../contracts/erreurs.ts'

export type { CorpsErreur }

// Aucun statut n'est ecrit ici : la route introuvable est une erreur comme une
// autre et passe par le terminal, sans quoi « un seul middleware produit toutes
// les erreurs » serait faux des la premiere route (AD-6).
export function routeIntrouvable(
  _requete: Request,
  _reponse: Response,
  suivant: NextFunction,
): void {
  suivant(new ErreurApi('ROUTE_INTROUVABLE'))
}

// `body-parser` marque ses echecs par `type`. Sans cette traduction, un corps
// trop gros ou un JSON casse ressortiraient en 500 : une panne serveur pour ce
// qui est une demande mal formee.
function codeDepuisErreurDeCorps(erreur: unknown): CodeErreur | undefined {
  const type = (erreur as { type?: unknown } | null)?.type

  if (type === 'entity.too.large') {
    return 'CORPS_TROP_VOLUMINEUX'
  }

  // Toutes les autres facons dont `body-parser` refuse un corps : jeu de
  // caracteres ou encodage non supportes, longueur annoncee non tenue,
  // connexion coupee en cours de lecture. Sans elles, une demande mal formee
  // ressort en 500 et se journalise comme une panne serveur.
  if (
    type === 'entity.parse.failed' ||
    type === 'charset.unsupported' ||
    type === 'encoding.unsupported' ||
    type === 'request.aborted' ||
    type === 'request.size.did.not.match.content.length' ||
    type === 'parameters.too.many'
  ) {
    return 'CORPS_ILLISIBLE'
  }

  return undefined
}

function journaliser(niveau: 'warn' | 'error', message: string, extra: object): void {
  const ligne = JSON.stringify({ niveau, message, ...extra })

  if (niveau === 'error') {
    console.error(ligne)

    return
  }

  console.warn(ligne)
}

function detailInterne(erreur: unknown): string {
  if (erreur instanceof Error) {
    return `${erreur.name}: ${erreur.message}`
  }

  return 'cause inconnue'
}

// Middleware terminal : toutes les erreurs de l'API passent par ici, et le
// corps servi est integralement construit depuis le catalogue de `contracts` —
// jamais depuis l'exception, dont ni le message ni la trace ne sortent.
export function gestionErreur(
  erreur: unknown,
  requete: Request,
  reponse: Response,
  suivant: NextFunction,
): void {
  const code: CodeErreur =
    erreur instanceof ErreurApi
      ? erreur.code
      : (codeDepuisErreurDeCorps(erreur) ?? 'ERREUR_INTERNE')

  const definition = CODES_ERREUR[code]

  const situation = { methode: requete.method, chemin: requete.originalUrl, code }

  // Une reponse deja commencee ne peut plus recevoir de statut : y ecrire
  // produirait un second corps colle au premier. Express clot alors la
  // connexion, et le client recoit une reponse tronquee plutot que corrompue.
  // C'est le cas le plus difficile a diagnostiquer, donc le dernier a pouvoir
  // sortir muet.
  if (reponse.headersSent) {
    journaliser('error', 'erreur survenue apres le debut de la reponse', {
      ...situation,
      detail: detailInterne(erreur),
      pile: erreur instanceof Error ? erreur.stack : undefined,
    })
    suivant(erreur)

    return
  }

  // Une cause imprevue est un defaut a corriger : elle est journalisee cote
  // serveur, avec son detail et sa pile, et servie sans eux.
  if (code === 'ERREUR_INTERNE') {
    journaliser('error', 'erreur non traitee sur une requete', {
      ...situation,
      detail: detailInterne(erreur),
      pile: erreur instanceof Error ? erreur.stack : undefined,
    })
  } else {
    // Les 4xx aussi laissent une trace : sans elle, une rafale de 429 ou de
    // 413 ne se voit nulle part, et c'est precisement ce qu'on veut observer
    // quand un plafond travaille.
    journaliser('warn', 'demande refusee', situation)
  }

  // Composition plutot que mutation : `CorpsErreur` est un contrat, et ses
  // champs sont `readonly`.
  const corps: CorpsErreur = {
    code,
    message: definition.message,
    ...(erreur instanceof ErreurApi && erreur.violations !== undefined
      ? { violations: erreur.violations }
      : {}),
    ...(erreur instanceof ErreurApi && erreur.details !== undefined
      ? { details: erreur.details }
      : {}),
  }

  reponse.status(definition.statut).json(corps)
}
