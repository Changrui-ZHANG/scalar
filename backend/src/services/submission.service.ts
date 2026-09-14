import { Types, type HydratedDocument } from 'mongoose'
import { ErreurApi } from '@scalar/shared/erreurs.ts'
import { CODE_ECHEC_TYPAGE, type RunnerCallbackBody } from '@scalar/shared/runner.ts'
import type { CreateSubmissionInput, CreatedSubmissionProjection } from '@scalar/shared/submission.ts'
import type { SubmissionFailureOrigin, SubmissionVerdict } from '@scalar/shared/submission.ts'
import { modeleSubmission } from '../models/index.ts'
import type { Submission } from '../models/submission.model.ts'
import type { ExerciseService } from './exercise.service.ts'
import type { QuotaService } from './quota.service.ts'
import type { RunnerAdapter } from './runner.adapter.ts'
import { DUPLICATE_KEY_CODE, mongoErrorCode } from './erreur-mongo.util.ts'

export interface ClassificationResultatBrut {
  readonly verdict: SubmissionVerdict
  readonly failureOrigin?: SubmissionFailureOrigin
}

// Classe le resultat brut en l'une des quatre issues terminales (story 2.6).
// `timedOut` prime sur tout : decide uniquement par le runner (host kill),
// jamais deduit ici (AD-11). Le code de sortie dedie distingue ensuite un
// echec de typage — jamais atteint `node --test` — d'un resultat ordinaire du
// lanceur de tests natif, lui-meme distingue par le detail par test : au
// moins un test « failed » signale une assertion de l'apprenant, son absence
// avec un code non nul signale une exception non interceptee hors assertion.
// Exportee pour un test unitaire sans base (meme patron que
// `familleInterpretation` dans `interpretation-verdict.ts`) : cette fonction
// est pure, c'est elle qui porte la matrice I/O de la spec, et elle doit donc
// s'executer meme sans `MONGODB_URI_TEST`.
export function classifierResultatBrut(corps: RunnerCallbackBody): ClassificationResultatBrut {
  if (corps.timedOut) {
    return { verdict: 'timeout', failureOrigin: 'apprenant' }
  }

  if (corps.exitCode === CODE_ECHEC_TYPAGE) {
    return { verdict: 'error', failureOrigin: 'apprenant' }
  }

  if (corps.exitCode === 0) {
    return { verdict: 'passed' }
  }

  // `exitCode` nul hors timeout, verifie avant le detail par test : ni le
  // lanceur de tests natif ni le wrapper de compilation ne rendent jamais ce
  // code (0, CODE_ECHEC_TYPAGE ou celui de `node --test`, tous non nuls
  // autrement). Seul le repli synthetique du runner avant toute execution
  // reelle (demon injoignable, image absente, `createContainer` en echec —
  // voir `serveur.ts`) le produit : aucune limite n'a ete franchie, la cause
  // est une absence d'infrastructure, donc `plateforme` (AD-11 : « la limite
  // franchie ou son absence »), jamais imputable au code de l'apprenant.
  // Verifie avant la branche suivante par robustesse : un corps de rappel
  // incoherent (exitCode nul mais un test marque « failed ») ne doit jamais
  // se classer `failed`/apprenant, alors qu'aucun test n'a pu reellement
  // s'executer sans un conteneur ayant produit un code de sortie.
  if (corps.exitCode === null) {
    return { verdict: 'error', failureOrigin: 'plateforme' }
  }

  if (corps.tests.some((cas) => cas.status === 'failed')) {
    return { verdict: 'failed', failureOrigin: 'apprenant' }
  }

  // `exitCode` non nul, hors typage, hors timeout, aucun test « failed » :
  // une exception non interceptee hors assertion, apres le demarrage des
  // tests (`firstTestAt` deja pose par le wrapper) — imputable au code de
  // l'apprenant.
  return { verdict: 'error', failureOrigin: 'apprenant' }
}

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
        // d'infrastructure, donc le quota reserve est libere (AD-14). Un
        // verdict terminal est ecrit immediatement — jamais laisse `queued`
        // sans indication (AD-11) : `status` reste `queued`, seul le verdict
        // porte l'echec.
        await this.quota.release(userId, 'executionSandbox', reservation.period).catch(() => undefined)
        creee.verdict = 'error'
        creee.failureOrigin = 'plateforme'
        creee.progressionEffect = { status: 'pending' }
        await creee.save()
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

  // Ecrit le resultat brut rapporte par le runner et classe le verdict
  // terminal (AD-11, AD-24). Le statut passe (ou reste) `running` — jamais
  // un des quatre verdicts, qui vit dans son propre champ. Un verdict deja
  // ecrit est immuable : un rappel tardif ne fait que completer la sortie
  // brute et le detail par test, jamais reclasser.
  async appliquerResultatBrut(submissionId: string, corps: RunnerCallbackBody): Promise<void> {
    // Une forme invalide leverait un `CastError` Mongoose depuis la lecture
    // qui suit, remontant en 500 indifferencie : verifiee ici, elle rejoint
    // le catalogue d'erreurs comme toute autre demande mal formee (AD-6).
    if (!Types.ObjectId.isValid(submissionId)) {
      throw new ErreurApi('TRAVAIL_RUNNER_INVALIDE')
    }

    const submission = await modeleSubmission().findById(submissionId).select('startedAt')

    if (!submission) {
      throw new ErreurApi('SOUMISSION_INTROUVABLE')
    }

    // Champs toujours completes, rappel tardif ou non (AD-11 : « la sortie
    // brute et le detail par test sont malgre tout completes »). `startedAt`
    // n'est lu qu'ici, jamais reecrit par une seconde ecriture concurrente :
    // sa seule consequence en cas de course est un instant legerement
    // decale, jamais une reclassification (a la difference du verdict).
    const champsToujours = {
      status: 'running' as const,
      startedAt: submission.startedAt ?? new Date(),
      finishedAt: new Date(corps.finishedAt),
      rawExitCode: corps.exitCode,
      rawSignal: corps.signal,
      rawOutput: corps.output,
      rawOutputTronque: corps.outputTruncated,
      queuePosition: undefined,
      testResults: corps.tests.map((cas, index) => ({
        index,
        name: cas.name,
        status: cas.status,
        expected: cas.expected,
        actual: cas.actual,
      })),
    }

    const classification = classifierResultatBrut(corps)
    const champsVerdict: Record<string, unknown> = {
      verdict: classification.verdict,
      // Intention de progression a l'etat `pending` (AD-22, AD-31) : seule
      // l'ecriture de cette intention est du perimetre de cette story, son
      // balayage et sa consommation restent hors champ.
      progressionEffect: { status: 'pending' },
    }

    if (classification.failureOrigin !== undefined) {
      champsVerdict.failureOrigin = classification.failureOrigin
    }

    if (corps.firstTestAt !== undefined) {
      champsVerdict.firstTestAt = new Date(corps.firstTestAt)
    }

    // Ecriture unique et conditionnelle (AD-32 : toute ecriture qui depend
    // d'un etat lu est conditionnelle, jamais un read-then-write separe) :
    // le filtre `verdict: { $exists: false }` est la garde d'immuabilite
    // d'AD-11, portee par le filtre de l'ecriture elle-meme. Verdict et
    // champs toujours-completes partent dans la MEME operation : plus de
    // fenetre ou un verdict serait pose sans sa sortie/detail si le process
    // s'arretait entre deux ecritures separees.
    const ecriture = await modeleSubmission().updateOne(
      { _id: submissionId, verdict: { $exists: false } },
      { $set: { ...champsToujours, ...champsVerdict } },
    )

    if (ecriture.matchedCount === 0) {
      // Verdict deja pose par un rappel precedent (AD-11) : rappel tardif,
      // seuls sortie brute et detail par test se completent, jamais le
      // verdict.
      await modeleSubmission().updateOne({ _id: submissionId }, { $set: champsToujours })
    }
  }
}
