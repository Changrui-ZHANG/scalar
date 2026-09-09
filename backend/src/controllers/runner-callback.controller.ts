import { timingSafeEqual } from 'node:crypto'
import { Router, type NextFunction, type Request, type Response } from 'express'
import * as v from 'valibot'
import { ErreurApi } from '@scalar/shared/erreurs.ts'
import { runnerCallbackSchema } from '@scalar/shared/runner.ts'
import type { SubmissionService } from '../services/submission.service.ts'

const EN_TETE_SECRET = 'x-scalar-runner-secret'

// Comparaison en temps constant (AD-16) : jamais `===`, dont la duree fuit le
// prefixe commun entre la valeur recue et la valeur attendue. Meme fonction
// que cote runner (`runner/src/http/serveur.ts`), dupliquee plutot que
// partagee : `shared/` ne depend d'aucun module natif.
function secretsEgaux(attendu: string, recu: string): boolean {
  const bufAttendu = Buffer.from(attendu, 'utf8')
  const bufRecu = Buffer.from(recu, 'utf8')

  if (bufAttendu.length !== bufRecu.length) {
    timingSafeEqual(bufRecu, bufRecu)

    return false
  }

  return timingSafeEqual(bufAttendu, bufRecu)
}

// Le transport, et rien d'autre : l'ecriture du resultat brut reste dans le
// service, seul ecrivain de la collection `submissions` (AD-2). Route
// interne, jamais montee sous la chaine `session`/`etatCompte` (AD-16) : sa
// seule protection est le secret du rappel, compare en temps constant.
export class RunnerCallbackController {
  private readonly service: SubmissionService
  private readonly secretRappel: string

  constructor(service: SubmissionService, secretRappel: string) {
    this.service = service
    this.secretRappel = secretRappel
  }

  recevoir = async (requete: Request, reponse: Response, suivant: NextFunction): Promise<void> => {
    try {
      const recu = requete.headers[EN_TETE_SECRET]

      if (typeof recu !== 'string' || !secretsEgaux(this.secretRappel, recu)) {
        throw new ErreurApi('SECRET_SERVICE_INVALIDE')
      }

      const submissionId = requete.params['submissionId']

      if (typeof submissionId !== 'string' || submissionId.length === 0) {
        throw new ErreurApi('TRAVAIL_RUNNER_INVALIDE')
      }

      const resultat = v.safeParse(runnerCallbackSchema, requete.body)

      if (!resultat.success) {
        throw new ErreurApi('TRAVAIL_RUNNER_INVALIDE')
      }

      await this.service.appliquerResultatBrut(submissionId, resultat.output)

      reponse.status(204).send()
    } catch (erreur) {
      suivant(erreur)
    }
  }

  // `POST /runner-callbacks/:submissionId` : rappel runner -> API a la fin
  // d'une execution. Un seul niveau d'imbrication (convention Routes).
  buildRouter(): Router {
    const routeur = Router()

    routeur.post('/runner-callbacks/:submissionId', this.recevoir)

    return routeur
  }
}
