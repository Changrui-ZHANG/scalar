import type { NextFunction, Request, Response } from 'express'

// Refus par defaut. Une reponse d'API est reputee dependre de la session tant
// qu'une route ne declare pas explicitement le contraire : un intermediaire qui
// met en cache une page personnalisee la sert ensuite au visiteur suivant, et
// le defaut ne se voit qu'une fois le proxy en place.
export function interdireCacheIntermediaire(
  _requete: Request,
  reponse: Response,
  suivant: NextFunction,
): void {
  reponse.set('Cache-Control', 'no-store')
  suivant()
}
