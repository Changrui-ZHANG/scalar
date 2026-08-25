import type { NextFunction, Request, Response } from 'express'

export interface CorpsErreur {
  code: string
  message: string
}

export function routeIntrouvable(_requete: Request, reponse: Response): void {
  reponse.status(404).json({
    code: 'ROUTE_INTROUVABLE',
    message: "Cette ressource n'existe pas.",
  } satisfies CorpsErreur)
}

// Middleware terminal : toutes les erreurs de l'API passent par ici, et
// aucun message d'exception n'est renvoye au client.
export function gestionErreur(
  erreur: unknown,
  _requete: Request,
  reponse: Response,
  _suivant: NextFunction,
): void {
  console.error(JSON.stringify({ niveau: 'error', message: String(erreur) }))

  reponse.status(500).json({
    code: 'ERREUR_INTERNE',
    message: 'Une erreur est survenue. Reessayez plus tard.',
  } satisfies CorpsErreur)
}
