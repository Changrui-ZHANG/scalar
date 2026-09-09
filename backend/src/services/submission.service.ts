import type { HydratedDocument } from 'mongoose'
import { ErreurApi } from '@scalar/shared/erreurs.ts'
import type { CreateSubmissionInput, CreatedSubmissionProjection } from '@scalar/shared/submission.ts'
import { modeleSubmission } from '../models/index.ts'
import type { Submission } from '../models/submission.model.ts'
import type { ExerciseService } from './exercise.service.ts'
import type { QuotaService } from './quota.service.ts'
import { DUPLICATE_KEY_CODE, mongoErrorCode } from './erreur-mongo.util.ts'

function toProjection(submission: HydratedDocument<Submission>): CreatedSubmissionProjection {
  return {
    id: submission.id as string,
    status: submission.status,
    acceptedAt: submission.acceptedAt.toISOString(),
  }
}

// Proprietaire du module `submissions`. Aucun appel au runner, aucun calcul de
// verdict (story 2.5) : cree une Soumission a l'etat `queued` et rend son
// identifiant, gardee par la deduplication (AD-9) et une reservation de quota
// minimale (AD-14).
export class SubmissionService {
  private readonly exercises: ExerciseService
  private readonly quota: QuotaService

  constructor(exercises: ExerciseService, quota: QuotaService) {
    this.exercises = exercises
    this.quota = quota
  }

  async create(userId: string, entree: CreateSubmissionInput): Promise<CreatedSubmissionProjection> {
    // L'existence est verifiee **avant toute autre chose**, y compris avant de
    // resoudre l'Exercice (voir Design Notes de spec-2-4) : une resoumission
    // legitime apres coupure ne doit jamais echouer parce qu'un Exercice a
    // change de statut entre-temps, ni parce que le quota est epuise. Trouvee,
    // elle est rendue telle quelle, sans toucher a l'un ou l'autre.
    const existante = await modeleSubmission().findOne({ userId, requestKey: entree.requestKey })

    if (existante) {
      return toProjection(existante)
    }

    // `EXERCICE_INTROUVABLE` si le slug ne resout aucun Exercice publie.
    const exercice = await this.exercises.trouverParSlugPublie(entree.exerciseSlug)

    const reservation = await this.quota.reserve(userId, 'executionSandbox')

    if (!reservation.granted) {
      throw new ErreurApi('QUOTA_DEPASSE', {
        details: {
          maximum: reservation.maximum,
          reinitialisationA: reservation.resetAt.toISOString(),
        },
      })
    }

    let creee: HydratedDocument<Submission>

    // Ce bloc n'entoure que l'ecriture : un succes a reellement consomme un
    // credit de quota, et rien apres ne doit plus pouvoir le liberer.
    try {
      creee = await modeleSubmission().create({
        userId,
        exerciseId: exercice.id,
        exerciseSlug: exercice.slug,
        code: entree.code,
        requestKey: entree.requestKey,
        status: 'queued',
        acceptedAt: new Date(),
      })
    } catch (erreur) {
      // Le credit reserve n'a servi a rien : il est rendu. Un echec de cette
      // liberation ne doit jamais remplacer ni masquer l'erreur d'origine.
      await this.quota.release(userId, 'executionSandbox', reservation.period).catch(() => undefined)

      if (mongoErrorCode(erreur) === DUPLICATE_KEY_CODE) {
        // Course concurrente sur une cle neuve : une autre requete a cree la
        // Soumission entre la recherche et cette ecriture. Meme protection :
        // un echec de cette relecture ne doit pas masquer l'erreur d'origine.
        const relue = await modeleSubmission()
          .findOne({ userId, requestKey: entree.requestKey })
          .catch(() => undefined)

        if (relue) {
          return toProjection(relue)
        }
      }

      throw erreur
    }

    return toProjection(creee)
  }
}
