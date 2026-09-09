import * as v from 'valibot'
import { LONGUEUR_MAX_SLUG_EXERCICE } from './exercise.ts'
import { LONGUEUR_MAX_CLE_DEDUPLICATION, LONGUEUR_MAX_CODE_SOUMISSION } from './limites.ts'

// Contrat de l'entite `Submission`, module `submissions`. Seul `queued`
// existe dans le perimetre de cette story : le calcul du verdict (story 2.6)
// introduira les statuts qui suivent une execution reelle.
export const SUBMISSION_STATUSES = ['queued'] as const

export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number]

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
