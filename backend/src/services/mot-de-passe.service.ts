import { hash, verify } from '@node-rs/argon2'
import { ALGORITHME_ARGON2ID, type ParametresArgon2 } from '@scalar/shared/hachage.ts'

// Hachage factice de reference pre-calcule sous les parametres declares.
// Verifie lorsque l'utilisateur n'est pas trouve en base afin d'assurer
// un temps de reponse constant et neutraliser les attaques temporelles.
export const HACHAGE_FACTICE =
  '$argon2id$v=19$m=19456,t=2,p=1$VyTqiMjkqI67TcvJZyHy7A$FT6kTBMTWJODkZ1PZ6mR2msK6065241nM2+9+AZ/m3w'

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

  // Effectue un calcul complet d'argon2id sur le hachage factice pour que le
  // temps de verification d'un email inconnu soit identique a celui d'un mauvais mot de passe.
  async verifierFactice(motDePasse: string): Promise<boolean> {
    return this.verifier(HACHAGE_FACTICE, motDePasse)
  }
}
