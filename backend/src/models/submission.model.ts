import { Schema, type Types } from 'mongoose'
import { LONGUEUR_MAX_SLUG_EXERCICE } from '@scalar/shared/exercise.ts'
import {
  LONGUEUR_MAX_CLE_DEDUPLICATION,
  LONGUEUR_MAX_CODE_SOUMISSION,
  LONGUEUR_MAX_VALEUR_TEST_RUNNER,
  TRONCATURE_SORTIE_OCTETS_MAX,
} from '@scalar/shared/limites.ts'
import { RUNNER_TEST_STATUSES } from '@scalar/shared/runner.ts'
import {
  SUBMISSION_FAILURE_ORIGINS,
  SUBMISSION_STATUSES,
  SUBMISSION_VERDICTS,
  type SubmissionFailureOrigin,
  type SubmissionStatus,
  type SubmissionVerdict,
} from '@scalar/shared/submission.ts'
import { NOM_MODELE_USER } from './user.model.ts'
import { NOM_MODELE_EXERCISE } from './exercise.model.ts'

export const NOM_MODELE_SUBMISSION = 'Submission'
export const COLLECTION_SUBMISSIONS = 'submissions'
export const VERSION_SCHEMA_SUBMISSION = 1

// Reexporte pour la meme raison que `STATUTS_EXERCICE` sur `Exercise` : le
// modele est l'endroit ou l'on vient chercher la forme d'une `Submission`.
export {
  SUBMISSION_FAILURE_ORIGINS,
  SUBMISSION_STATUSES,
  SUBMISSION_VERDICTS,
  type SubmissionFailureOrigin,
  type SubmissionStatus,
  type SubmissionVerdict,
}

// Detail d'un test resolu, projete sur `Submission` (story 2.6). `index`
// porte l'ordre d'execution — absent du contrat runner (`RunnerTestResult`),
// c'est `submission.service` qui le pose au moment d'ecrire ce tableau.
export interface SubmissionTestResult {
  index: number
  name: string
  status: (typeof RUNNER_TEST_STATUSES)[number]
  expected?: string
  actual?: string
}

// Intention de progression a l'etat `pending` (AD-22, AD-31) : seule
// l'ecriture de cette intention est du perimetre de cette story, jamais son
// balayage ni sa consommation.
export interface SubmissionProgressionEffect {
  status: 'pending'
}

// Aucun comportement ici : la deduplication (AD-9), la reservation de quota
// (AD-14) et la projection de sortie vivent dans
// `services/submission.service.ts`, seul ecrivain de cette collection.
export interface Submission {
  userId: Types.ObjectId
  exerciseId: Types.ObjectId
  exerciseSlug: string
  code: string
  requestKey: string
  status: SubmissionStatus
  // Distinct de `createdAt` (AD-11) : ce champ est du vocabulaire de domaine,
  // porte par le contrat de sortie ; `createdAt` reste un suivi technique
  // Mongoose que la sortie ne sert jamais.
  acceptedAt: Date
  // Non peuples tant que le modele `catalog` n'existe pas (epic 3/6) : voir le
  // Spec Change Log de spec-2-4, meme patron de deviation que `estVerrouille`
  // sur `Exercise`.
  pathId?: Types.ObjectId
  pathVersion?: number
  // Champs de la story 2.5 : un resultat brut. `startedAt` est pose des
  // l'admission par le runner (AD-26) ; `finishedAt` et les champs `raw*`
  // n'arrivent qu'au rappel.
  startedAt?: Date
  finishedAt?: Date
  rawExitCode?: number | null
  rawSignal?: string | null
  rawOutput?: string
  rawOutputTronque?: boolean
  // Position en file au moment du depot, quand le plafond de concurrence du
  // runner est atteint (AD-26). Observable, mais sans consommateur UI dans
  // le perimetre de cette story.
  queuePosition?: number
  // Champs de la story 2.6 : la classification du resultat brut ci-dessus.
  // `verdict` et `failureOrigin` sont ecrits une seule fois (AD-11) ; un
  // rappel tardif ne les touche plus, seuls `testResults` et les champs
  // `raw*` se completent. `firstTestAt` absent distingue un echec de
  // compilation (jamais atteint `node --test`) d'une exception non
  // interceptee (l'a atteint puis a crashe) — voir
  // `services/interpretation-verdict.ts`.
  verdict?: SubmissionVerdict
  failureOrigin?: SubmissionFailureOrigin
  firstTestAt?: Date
  testResults?: SubmissionTestResult[]
  progressionEffect?: SubmissionProgressionEffect
  schemaVersion: number
}

export const schemaSubmission = new Schema<Submission>(
  {
    userId: { type: Schema.Types.ObjectId, ref: NOM_MODELE_USER, required: true },
    exerciseId: { type: Schema.Types.ObjectId, ref: NOM_MODELE_EXERCISE, required: true },
    // Recopie du slug au moment de la soumission : un Exercice peut changer de
    // slug plus tard (epic 3), et une Soumission passee doit continuer a dire
    // sur quel exercice, tel que nomme alors, elle portait.
    exerciseSlug: { type: String, required: true, trim: true, maxlength: LONGUEUR_MAX_SLUG_EXERCICE },
    // Jamais trim (voir `shared/submission.ts`) : c'est le code source soumis.
    code: { type: String, required: true, maxlength: LONGUEUR_MAX_CODE_SOUMISSION },
    requestKey: { type: String, required: true, trim: true, maxlength: LONGUEUR_MAX_CLE_DEDUPLICATION },
    status: {
      type: String,
      required: true,
      enum: [...SUBMISSION_STATUSES],
      default: 'queued',
    },
    acceptedAt: { type: Date, required: true },
    pathId: { type: Schema.Types.ObjectId, required: false },
    pathVersion: { type: Number, required: false },
    startedAt: { type: Date, required: false },
    finishedAt: { type: Date, required: false },
    rawExitCode: { type: Number, required: false },
    rawSignal: { type: String, required: false },
    rawOutput: { type: String, required: false, maxlength: TRONCATURE_SORTIE_OCTETS_MAX },
    rawOutputTronque: { type: Boolean, required: false },
    queuePosition: { type: Number, required: false },
    verdict: { type: String, required: false, enum: [...SUBMISSION_VERDICTS] },
    failureOrigin: { type: String, required: false, enum: [...SUBMISSION_FAILURE_ORIGINS] },
    firstTestAt: { type: Date, required: false },
    testResults: {
      type: [
        {
          _id: false,
          index: { type: Number, required: true },
          name: { type: String, required: true },
          status: { type: String, required: true, enum: [...RUNNER_TEST_STATUSES] },
          expected: { type: String, required: false, maxlength: LONGUEUR_MAX_VALEUR_TEST_RUNNER },
          actual: { type: String, required: false, maxlength: LONGUEUR_MAX_VALEUR_TEST_RUNNER },
        },
      ],
      required: false,
    },
    progressionEffect: {
      type: new Schema(
        { status: { type: String, required: true, enum: ['pending'] } },
        { _id: false },
      ),
      required: false,
    },
    schemaVersion: { type: Number, required: true, default: VERSION_SCHEMA_SUBMISSION },
  },
  {
    collection: COLLECTION_SUBMISSIONS,
    // Aucun index ni collection cree implicitement : `creer-index` est le seul
    // chemin de creation, et le demarrage verifie le resultat.
    autoIndex: false,
    autoCreate: false,
    timestamps: true,
  },
)
