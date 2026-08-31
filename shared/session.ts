import type { EtatCompte } from './compte.ts'

// Exactement deux cookies dans tout le produit. Un troisieme est un conflit a
// remonter, pas une commodite : c'est la seule raison pour laquelle cette
// liste est close plutot que descriptive. `scalar_prefs` n'est pas pose par ce
// run — il est nomme ici pour que la liste soit verifiable des maintenant.
export const NOM_COOKIE_SESSION = 'scalar_session'
export const NOM_COOKIE_PREFERENCES = 'scalar_prefs'
export const COOKIES_DECLARES = [NOM_COOKIE_SESSION, NOM_COOKIE_PREFERENCES] as const

// 32 octets d'alea, transportes en base64url — un alphabet qui ne demande
// aucun echappement dans un en-tete `Cookie`, ce qui evite d'avoir a decider
// quoi faire d'une valeur percent-encodee a la relecture.
export const OCTETS_JETON_SESSION = 32

// Ce que le front sait du compte, et rien de plus. Ni le jeton, ni son
// hachage, ni le hachage du mot de passe n'y ont d'entree : leur absence ici
// est le contrat, leur exclusion au niveau du modele en est le filet.
//
// Les champs qui refletent un champ persiste en gardent le nom anglais
// (`displayName`, `accountState`) pour qu'une divergence se voie ; ceux qui
// sont derives a la lecture suivent les identifiants du depot.
export interface ChargeUtileSession {
  readonly id: string
  readonly displayName: string
  readonly accountState: EtatCompte
  readonly situations: readonly SituationCompte[]
  // Adresse ciblee par une verification en attente. Presente seulement quand
  // une situation la rend necessaire : le bandeau doit la nommer.
  readonly adresseAVerifier?: string
}

// Ce que la chaine de middlewares attache a une requete authentifiee. Deliberement maigre : ni nom, ni adresse, ni rien qui donnerait a un maillon
// d'autorisation de quoi decider sur autre chose que l'identite et l'etat. Le
// role s'y ajoutera avec le maillon qui le lit.
export interface Principal {
  readonly id: string
  readonly accountState: EtatCompte
}

// L'ordre **est** la priorite, du plus restrictif au moins restrictif : une
// seule situation s'affiche a la fois, et c'est la premiere de cette liste que
// le compte presente. Les deux dernieres n'ont pas encore de producteur ; leur
// place dans l'ordre se decide ici, une fois, plutot que dans le composant qui
// les rencontrera en premier.
export const SITUATIONS_COMPTE = [
  'compteNonVerifie',
  'paiementEnPropagation',
  'abonnementEnFinDePeriode',
] as const

export type SituationCompte = (typeof SITUATIONS_COMPTE)[number]

// Rend la situation a afficher, ou `undefined` s'il n'y en a aucune. Une
// situation inconnue de la liste est ignoree plutot que servie : c'est le seul
// comportement qui laisse un front ancien lire une charge utile plus recente
// sans afficher un bandeau vide.
export function situationDominante(
  situations: readonly SituationCompte[],
): SituationCompte | undefined {
  return SITUATIONS_COMPTE.find((candidate) => situations.includes(candidate))
}
