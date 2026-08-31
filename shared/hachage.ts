// Depositaire du contrat de hachage de mot de passe. Comme `proxy.ts`, ce
// fichier porte une limite declaree — le plancher argon2id — hors de
// `limites.ts`, parce qu'elle ne se lit qu'a cote de l'algorithme qu'elle
// borne. `limites.ts` nomme les deux exceptions ; il n'y en a pas d'autre.

export interface ParametresArgon2 {
  readonly memoireKiB: number
  readonly iterations: number
  readonly parallelisme: number
}

// Plancher OWASP pour argon2id (m = 19 456 KiB, t = 2, p = 1). Ce n'est pas
// une valeur par defaut reglable vers le bas : `config/` refuse de demarrer en
// dessous, et le relacher est une decision a prendre explicitement, pas une
// variable d'environnement a baisser un soir de mise en production.
export const PLANCHER_ARGON2: ParametresArgon2 = {
  memoireKiB: 19_456,
  iterations: 2,
  parallelisme: 1,
}

// `@node-rs/argon2` declare son `Algorithm` en `const enum` : l'export
// JavaScript du paquet est un objet **vide**, et `Algorithm.Argon2id` vaut
// `undefined` a l'execution une fois les types retires par Node. Ecrire
// `algorithm: Algorithm.Argon2id` compilerait, passerait la relecture, et
// laisserait le paquet retomber en silence sur son defaut. La valeur est donc
// reprise ici, et `tests/hachage.test.ts` la confronte a ce que `parseOptions`
// relit dans un hachage reellement produit.
export const ALGORITHME_ARGON2ID = 2
