import type { Request, RequestHandler } from 'express'
import * as v from 'valibot'
import { ErreurApi, MAX_VIOLATIONS, MESSAGES_VIOLATION } from '../contracts/erreurs.ts'
import type { NatureViolation, Violation } from '../contracts/erreurs.ts'

export type Emplacement = 'corps' | 'requete' | 'chemin'

export interface Valide<T> {
  readonly middleware: RequestHandler
  readonly lire: (requete: Request) => T
}

function sourceDe(requete: Request, emplacement: Emplacement): unknown {
  if (emplacement === 'corps') {
    return requete.body
  }

  if (emplacement === 'requete') {
    return requete.query
  }

  if (emplacement === 'chemin') {
    return requete.params
  }

  // Un emplacement ajoute sans etre traite ici retomberait autrement sur les
  // parametres de chemin : le schema validerait la mauvaise source, et une
  // donnee non validee atteindrait le service.
  throw new Error(`Emplacement de validation inconnu : « ${String(emplacement)} ».`)
}

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

function enViolations(problemes: readonly v.BaseIssue<unknown>[]): readonly Violation[] {
  return problemes.slice(0, MAX_VIOLATIONS).map((probleme) => ({
    chemin:
      probleme.path
        ?.map((segment) => (segment.key === undefined ? '(racine)' : String(segment.key)))
        .join('.') ?? '(racine)',
    message: MESSAGES_VIOLATION[natureDe(probleme)],
  }))
}

// Le resultat n'est pas reecrit sur la requete : en Express 5 `query` est un
// accesseur, et surtout un service ne doit pouvoir lire que la sortie du schema
// — jamais l'objet brut reste a cote (AD-7). D'ou le couple middleware/lecteur :
// le seul chemin vers la donnee validee est type par le schema.
export function valider<S extends v.GenericSchema>(
  emplacement: Emplacement,
  schema: S,
): Valide<v.InferOutput<S>> {
  const validees = new WeakMap<Request, v.InferOutput<S>>()

  const middleware: RequestHandler = (requete, _reponse, suivant): void => {
    const resultat = v.safeParse(schema, sourceDe(requete, emplacement))

    if (!resultat.success) {
      suivant(new ErreurApi('REQUETE_INVALIDE', { violations: enViolations(resultat.issues) }))

      return
    }

    validees.set(requete, resultat.output)
    suivant()
  }

  // Absente si le middleware n'a pas tourne : un handler qui lit hors de la
  // chaine doit echouer bruyamment, pas se voir offrir un objet vide.
  const lire = (requete: Request): v.InferOutput<S> => {
    const donnee = validees.get(requete)

    if (donnee === undefined) {
      throw new Error(
        `Aucune donnee validee pour l emplacement « ${emplacement} » : le middleware de validation n a pas tourne sur cette requete.`,
      )
    }

    return donnee
  }

  return { middleware, lire }
}
