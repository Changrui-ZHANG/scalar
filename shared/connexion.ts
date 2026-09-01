import * as v from 'valibot'
import {
  canoniserEmail,
  LONGUEUR_MAX_EMAIL,
  LONGUEUR_MAX_MOT_DE_PASSE,
} from './inscription.ts'

// Le schéma de connexion vit dans shared pour être validé au bord sur le backend
// et avant envoi sur le front, évitant ainsi d'émettre une requête vouée à l'échec
// qui consommerait inutilement le plafond sensible.

export { canoniserEmail }

export const schemaConnexion = v.object({
  email: v.pipe(
    v.string(),
    v.transform(canoniserEmail),
    v.maxLength(LONGUEUR_MAX_EMAIL),
    v.email(),
  ),
  motDePasse: v.pipe(
    v.string(),
    v.minLength(1),
    v.maxLength(LONGUEUR_MAX_MOT_DE_PASSE),
  ),
})

export type EntreeConnexion = v.InferOutput<typeof schemaConnexion>
