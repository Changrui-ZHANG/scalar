import { Router, type NextFunction, type Request, type Response } from 'express'
import { createSubmissionSchema, type CreateSubmissionInput } from '@scalar/shared/submission.ts'
import type { SubmissionService } from '../services/submission.service.ts'
import { valider, type Valide } from '../middlewares/validation.middleware.ts'
import { construireEtatCompte } from '../middlewares/etat-compte.middleware.ts'
import { lirePrincipal } from '../middlewares/session.middleware.ts'

// Le transport, et rien d'autre : aucune regle de deduplication, aucune
// reservation de quota. Ce fichier traduit HTTP, tout le reste vit dans le
// service (AD-9, AD-14).
export class SubmissionController {
  private readonly service: SubmissionService
  private readonly valideCreation: Valide<CreateSubmissionInput>

  constructor(service: SubmissionService) {
    this.service = service
    this.valideCreation = valider('corps', createSubmissionSchema)
  }

  create = async (requete: Request, reponse: Response, suivant: NextFunction): Promise<void> => {
    try {
      const principal = lirePrincipal(requete)

      // `construireEtatCompte('active')` a deja garanti la presence d'un
      // principal avant que ce handler ne tourne : cette branche ne s'atteint
      // jamais en usage normal, mais elle reste un garde-fou type-sur plutot
      // qu'une assertion non verifiee — si elle s'atteignait, ce serait un
      // defaut de montage de la route, pas une donnee d'appelant a refuser
      // proprement.
      if (principal === undefined) {
        throw new Error(
          'principal absent : construireEtatCompte(active) doit preceder ce handler sur la route.',
        )
      }

      const projection = await this.service.create(principal.id, this.valideCreation.lire(requete))

      reponse.status(201).json(projection)
    } catch (erreur) {
      suivant(erreur)
    }
  }

  // `POST /submissions` : creation d'une Soumission a l'etat `queued`. Le
  // plafond sensible ne se monte pas ici : il est declare dans
  // `shared/limites.ts` et applique par le premier maillon de la chaine,
  // avant la session — comme pour `/accounts` et `/sessions`.
  buildRouter(): Router {
    const routeur = Router()

    routeur.post(
      '/submissions',
      construireEtatCompte('active'),
      this.valideCreation.middleware,
      this.create,
    )

    return routeur
  }
}
