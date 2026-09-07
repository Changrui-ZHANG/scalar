import { Router, type NextFunction, type Request, type Response } from 'express'
import { schemaSlugExercice, type ParametresSlugExercice } from '@scalar/shared/exercise.ts'
import type { ExerciseService } from '../services/exercise.service.ts'
import { valider, type Valide } from '../middlewares/validation.middleware.ts'

// Le transport, et rien d'autre : aucune regle de visibilite, aucun acces
// base. Ce fichier traduit HTTP, la decision d'exposer ou non un contenu
// reste entierement dans le service (AD-10).
export class ExerciseController {
  private readonly service: ExerciseService
  private readonly valideSlug: Valide<ParametresSlugExercice>

  constructor(service: ExerciseService) {
    this.service = service
    this.valideSlug = valider('chemin', schemaSlugExercice)
  }

  obtenirParSlug = async (
    requete: Request,
    reponse: Response,
    suivant: NextFunction,
  ): Promise<void> => {
    try {
      const { slug } = this.valideSlug.lire(requete)
      const projection = await this.service.trouverParSlugPublie(slug)

      // La projection publique, et elle seule : jamais un document Mongoose.
      reponse.status(200).json(projection)
    } catch (erreur) {
      suivant(erreur)
    }
  }

  // `GET /exercises/:slug`, sous le prefixe `/api/v1` : consultation publique
  // d'un Exercice publie. Aucun maillon `role` ni `etatCompte` ne se monte
  // ici -- le verrouillage freemium (FR-8) est un champ de charge utile, pas
  // un controle d'acces, et reste hors perimetre de cette story (AD-6).
  buildRouter(): Router {
    const routeur = Router()

    routeur.get('/exercises/:slug', this.valideSlug.middleware, this.obtenirParSlug)

    return routeur
  }
}
