import { Types, type HydratedDocument } from 'mongoose'
import { ErreurApi } from '@scalar/shared/erreurs.ts'
import type { RunnerCallbackBody } from '@scalar/shared/runner.ts'
import type { CreateSubmissionInput, CreatedSubmissionProjection } from '@scalar/shared/submission.ts'
import { modeleSubmission } from '../models/index.ts'
import type { Submission } from '../models/submission.model.ts'
import type { ExerciseService } from './exercise.service.ts'
import type { QuotaService } from './quota.service.ts'
import type { RunnerAdapter } from './runner.adapter.ts'
import { DUPLICATE_KEY_CODE, mongoErrorCode } from './erreur-mongo.util.ts'

function toProjection(submission: HydratedDocument<Submission>): CreatedSubmissionProjection {
  return {
    id: submission.id as string,
    status: submission.status,
    acceptedAt: submission.acceptedAt.toISOString(),
  }
}

// Proprietaire du module `submissions`. Cree une Soumission a l'etat `queued`,
// gardee par la deduplication (AD-9) et une reservation de quota minimale
// (AD-14), puis la depose aupres du runner (AD-3, AD-26). Aucun calcul de
// verdict : la classification en quatre valeurs reste a la story 2.6.
export class SubmissionService {
  private readonly exercises: ExerciseService
  private readonly quota: QuotaService
  private readonly runner: RunnerAdapter

  constructor(exercises: ExerciseService, quota: QuotaService, runner: RunnerAdapter) {
    this.exercises = exercises
    this.quota = quota
    this.runner = runner
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

    // Depot aupres du runner (AD-3), apres persistance (AD-11 : « la
    // Soumission est persistee avant le lancement de l'execution »). Le corps
    // des tests, caches inclus, vient de l'accesseur `interne-runner`
    // (AD-21) — jamais de la projection publique deja lue plus haut, qui
    // omet le corps d'un test cache (AD-13).
    //
    // Ce bloc entoure aussi la resolution des tests : une erreur ici (par
    // exemple l'Exercice retire ou depublie dans la fenetre etroite depuis
    // le controle plus haut) ne doit pas plus laisser le quota reserve
    // bloque que l'echec du depot lui-meme — meme liberation (AD-14), avant
    // de laisser l'erreur remonter.
    try {
      const tests = await this.exercises.trouverTestsPourRunner(exercice.id)
      const admission = await this.runner.deposer(creee.id as string, {
        languageId: exercice.language,
        code: entree.code,
        tests,
      })

      if (admission === undefined) {
        // Runner injoignable malgre les tentatives (AD-28) : panne
        // d'infrastructure, donc le quota reserve est libere (AD-14). La
        // Soumission reste `queued` — aucun statut d'echec n'existe encore
        // dans le perimetre de cette story (story 2.6).
        await this.quota.release(userId, 'executionSandbox', reservation.period).catch(() => undefined)
      } else if (admission.admis) {
        creee.status = 'running'
        creee.startedAt = new Date()
        await creee.save()
      } else {
        creee.queuePosition = admission.position
        await creee.save()
      }
    } catch (erreur) {
      await this.quota.release(userId, 'executionSandbox', reservation.period).catch(() => undefined)

      throw erreur
    }

    return toProjection(creee)
  }

  // Ecrit le resultat brut rapporte par le runner (AD-11, AD-24). Le statut
  // passe (ou reste) `running`, que la Soumission ait ete admise
  // immediatement ou mise en file au depot — dans les deux cas, arriver ici
  // signifie qu'une execution a reellement eu lieu. Aucune classification :
  // la story 2.6 lira ces champs pour ecrire le verdict terminal.
  async appliquerResultatBrut(submissionId: string, corps: RunnerCallbackBody): Promise<void> {
    // Une forme invalide leverait un `CastError` Mongoose depuis `findById`,
    // remontant en 500 indifferencie : verifiee ici, elle rejoint le
    // catalogue d'erreurs comme toute autre demande mal formee (AD-6).
    if (!Types.ObjectId.isValid(submissionId)) {
      throw new ErreurApi('TRAVAIL_RUNNER_INVALIDE')
    }

    const submission = await modeleSubmission().findById(submissionId)

    if (!submission) {
      throw new ErreurApi('SOUMISSION_INTROUVABLE')
    }

    submission.status = 'running'
    submission.startedAt ??= new Date()
    submission.finishedAt = new Date(corps.finishedAt)
    submission.rawExitCode = corps.exitCode
    submission.rawSignal = corps.signal
    submission.rawOutput = corps.output
    submission.rawOutputTronque = corps.outputTruncated
    submission.queuePosition = undefined

    await submission.save()
  }
}
