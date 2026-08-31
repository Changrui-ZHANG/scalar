import { hash, verify } from '@node-rs/argon2'
import { ALGORITHME_ARGON2ID, type ParametresArgon2 } from '@scalar/shared/hachage.ts'

// Seul endroit du backend qui hache ou compare un mot de passe. Les parametres
// viennent de `config/`, qui les a valides contre le plancher au demarrage :
// ce service ne les revalide pas, il les applique.
export class MotDePasseService {
  private readonly parametres: ParametresArgon2

  // Affectation explicite plutot qu'une propriete de parametre : Node retire
  // les types sans les compiler et rejetterait `constructor(private x)`.
  constructor(parametres: ParametresArgon2) {
    this.parametres = parametres
  }

  // Le sel est tire par la bibliotheque et voyage dans la chaine PHC rendue,
  // avec les parametres employes : rehacher plus fort plus tard n'invalide donc
  // aucun hachage existant.
  async hacher(motDePasse: string): Promise<string> {
    return hash(motDePasse, {
      algorithm: ALGORITHME_ARGON2ID,
      memoryCost: this.parametres.memoireKiB,
      timeCost: this.parametres.iterations,
      parallelism: this.parametres.parallelisme,
    })
  }

  // Les parametres de verification sont relus dans la chaine PHC, pas repris
  // de la configuration : un hachage produit sous d'anciens parametres doit
  // rester verifiable apres un durcissement.
  async verifier(hachage: string, motDePasse: string): Promise<boolean> {
    try {
      return await verify(hachage, motDePasse)
    } catch {
      return false
    }
  }
}
