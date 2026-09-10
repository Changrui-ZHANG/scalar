import * as v from 'valibot'
import { LONGUEUR_MAX_SLUG_EXERCICE } from './exercise.ts'
import { LONGUEUR_MAX_CLE_DEDUPLICATION, LONGUEUR_MAX_CODE_SOUMISSION } from './limites.ts'

// Contrat de l'entite `Submission`, module `submissions`. `running` rejoint
// `queued` avec la story 2.5 : le runner execute reellement le travail et
// rappelle un resultat brut. Les quatre issues terminales ne rejoignent
// jamais ce statut (AD-11) : elles vivent dans `SubmissionVerdict`, un champ
// distinct ecrit par `submission.service` (story 2.6).
export const SUBMISSION_STATUSES = ['queued', 'running'] as const

export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number]

// Le verdict (story 2.6) est un champ separe du statut de cycle de vie
// (AD-11) : `status` ne rejoint jamais l'une de ces quatre valeurs, et un
// verdict ecrit est immuable. `submission.service` seul transitionne vers
// l'une d'elles.
export const SUBMISSION_VERDICTS = ['passed', 'failed', 'error', 'timeout'] as const

export type SubmissionVerdict = (typeof SUBMISSION_VERDICTS)[number]

// Origine d'un verdict non `passed` (story 2.6) : distingue ce qui revient a
// l'apprenant (son code, une duree depassee) de ce qui revient a la
// plateforme (le depot runner injoignable apres tentatives, AD-28) — deux
// suites tres differentes pour qui lit ce champ.
export const SUBMISSION_FAILURE_ORIGINS = ['apprenant', 'plateforme'] as const

export type SubmissionFailureOrigin = (typeof SUBMISSION_FAILURE_ORIGINS)[number]

// `code` n'est jamais trim : c'est le code source soumis, et une troncature
// des espaces de tete ou de fin en changerait le sens dans un langage ou
// l'indentation compte (meme choix que `starterCode` sur `Exercise`). Seule
// une chaine entierement vide ou blanche est refusee.
function isNonBlank(valeur: string): boolean {
  return valeur.trim().length > 0
}

export const createSubmissionSchema = v.object({
  exerciseSlug: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1),
    v.maxLength(LONGUEUR_MAX_SLUG_EXERCICE),
  ),
  code: v.pipe(v.string(), v.check(isNonBlank), v.maxLength(LONGUEUR_MAX_CODE_SOUMISSION)),
  // Chaine opaque (AD-7) : jamais interpretee, seulement bornee en longueur.
  requestKey: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1),
    v.maxLength(LONGUEUR_MAX_CLE_DEDUPLICATION),
  ),
})

export type CreateSubmissionInput = v.InferOutput<typeof createSubmissionSchema>

// Ce qu'une creation rend immediatement (AD-11) : de quoi identifier la
// Soumission et savoir qu'elle a bien ete acceptee, rien de plus — aucun
// verdict, aucune execution n'a encore eu lieu.
export interface CreatedSubmissionProjection {
  readonly id: string
  readonly status: SubmissionStatus
  readonly acceptedAt: string
}
