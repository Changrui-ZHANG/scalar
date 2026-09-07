import * as v from 'valibot'
import { NOMBRE_MAX_TESTS_EXERCICE, OCTETS_MAX_TESTS_EXERCICE } from './limites.ts'

// Contrat de l'entite `Exercise`, module `exercises`. Les bornes des tests
// embarques (AD-8) viennent de `limites.ts`, jamais recopiees ici — c'est le
// meme nombre que le modele Mongoose applique a l'ecriture.
export { NOMBRE_MAX_TESTS_EXERCICE, OCTETS_MAX_TESTS_EXERCICE }

// Statut de revue d'un Exercice. Seul `published` franchit la couche service
// pour un apprenant (AD-10) ; les trois autres n'ont pas encore de surface —
// leur cycle de vie complet relevera de la revue du catalogue (epic 3).
export const STATUTS_EXERCICE = ['draft', 'in_review', 'published', 'archived'] as const

export type StatutExercice = (typeof STATUTS_EXERCICE)[number]

// Longueur d'un slug fourni par l'URL : une chaine opaque, validee en forme
// et en longueur (AD-7), jamais interpretee autrement qu'en cle de recherche.
export const LONGUEUR_MAX_SLUG_EXERCICE = 100

export const schemaSlugExercice = v.object({
  slug: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(LONGUEUR_MAX_SLUG_EXERCICE)),
})

export type ParametresSlugExercice = v.InferOutput<typeof schemaSlugExercice>

// Ce qu'un test visible sert : son corps complet, parce que l'apprenant doit
// pouvoir le lire pour comprendre l'attente.
export interface TestVisible {
  readonly name: string
  readonly assertion: string
  readonly code: string
}

// Ce qu'un test cache sert : jamais son corps (AD-13). Le nom et le message
// d'assertion restent exposables — c'est ce qui permet a un test cache
// echoue de se faire comprendre sans reveler comment il verifie quoi que ce
// soit.
export interface TestCache {
  readonly name: string
  readonly assertion: string
}

// Projection `publique` d'un Exercice (AD-21). Aucun champ n'y est
// conditionnel a l'appelant : `estVerrouille` est toujours present, fige a
// `false` tant que le calcul reel du verrouillage freemium (FR-8) n'est pas
// branche par le module `learning` et son projecteur. La position et le
// cardinal dans un parent (Lecon, Module) relevent de la route qui liste ce
// parent, pas de cette projection portant sur un Exercice pris isolement.
export interface ProjectionExercicePublique {
  readonly id: string
  readonly slug: string
  readonly title: string
  readonly statement: string
  readonly starterCode: string
  readonly language: string
  readonly testsVisibles: readonly TestVisible[]
  readonly testsCaches: readonly TestCache[]
  // Nombre total de tests, caches inclus (AD-13, AD-21).
  readonly totalTests: number
  // Toujours peuple (AD-21) ; toujours `false` dans le perimetre de cette
  // story (voir Spec Change Log de spec-2-2).
  readonly estVerrouille: boolean
}
