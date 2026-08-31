import type * as v from 'valibot'
import { MAX_VIOLATIONS, MESSAGES_VIOLATION } from './erreurs.ts'
import type { NatureViolation, Violation } from './erreurs.ts'

// La traduction d'un echec de schema en `violations` vit ici parce que les deux
// cotes la font : le backend au bord, le front avant d'envoyer. Deux traductions
// donneraient deux textes pour le meme refus, et c'est le front qui aurait tort
// — l'ecran dirait une chose, la reponse serveur une autre.

// Traduction volontairement grossiere : le `chemin` dit quel champ est en
// cause, ce message dit quoi en faire. Reprendre le texte de valibot servirait
// de l'anglais, decrirait le schema, et rejouerait la valeur recue.
function natureDe(probleme: v.BaseIssue<unknown>): NatureViolation {
  if (probleme.received === 'undefined') {
    return 'absent'
  }

  if (probleme.kind === 'schema') {
    return 'type'
  }

  if (probleme.type.includes('length') || probleme.type === 'size') {
    return 'longueur'
  }

  if (probleme.type === 'value' || probleme.type.endsWith('_value')) {
    return 'valeur'
  }

  return 'forme'
}

export function enViolations(problemes: readonly v.BaseIssue<unknown>[]): readonly Violation[] {
  return problemes.slice(0, MAX_VIOLATIONS).map((probleme) => {
    const chemin = probleme.path
      ?.map((segment) => (segment.key === undefined ? '(racine)' : String(segment.key)))
      .join('.')

    return {
      chemin: chemin && chemin.length > 0 ? chemin : '(racine)',
      message: MESSAGES_VIOLATION[natureDe(probleme)],
    }
  })
}
