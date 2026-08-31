// L'etat de compte est un axe **distinct** du role : ni l'un ni l'autre ne se
// range dans l'echelle de l'autre, et les deux se resolvent par requete sans
// jamais etre recopies sur un document — pas meme sur une `Session`, ou la
// copie ferait survivre un acces revoque toute la duree de cette session.

export const ETATS_COMPTE = ['unverified', 'active', 'suspended', 'erased'] as const

export type EtatCompte = (typeof ETATS_COMPTE)[number]

// Echelle de suffisance, qui n'est pas l'ordre de declaration : `suspended` et
// `erased` ne sont pas « au-dessus » d'`active`, ils sont **hors** de
// l'echelle. D'ou un rang negatif plutot qu'une absence, qu'une comparaison
// numerique lirait comme zero — donc comme suffisant pour un minimum
// `unverified`, ce qui laisserait un compte suspendu franchir le maillon.
export const RANG_ETAT_COMPTE = {
  unverified: 0,
  active: 1,
  suspended: -1,
  erased: -1,
} as const satisfies Record<EtatCompte, number>

// Refus par defaut : un etat hors echelle ne satisfait aucun minimum, y
// compris un minimum lui-meme hors echelle.
export function etatSuffit(etat: EtatCompte, minimum: EtatCompte): boolean {
  const rang = RANG_ETAT_COMPTE[etat]
  const requis = RANG_ETAT_COMPTE[minimum]

  return rang >= 0 && requis >= 0 && rang >= requis
}
