import { ErreurApi } from '@scalar/shared/erreurs.ts'
import type { EntreeInscription } from '@scalar/shared/inscription.ts'
import type { EntreeConnexion } from '@scalar/shared/connexion.ts'
import type { ChargeUtileSession, Principal, SituationCompte } from '@scalar/shared/session.ts'
import { etatSuffit, type EtatCompte } from '@scalar/shared/compte.ts'
import { modeleUser, normaliserEmail } from '../models/index.ts'
import { MotDePasseService } from './mot-de-passe.service.ts'
import { SessionService, type SessionOuverte } from './session.service.ts'

// MongoDB signale une violation d'index unique par ce code, et par lui seul.
const CLE_DUPLIQUEE = 11000

export interface CompteCree {
  readonly chargeUtile: ChargeUtileSession
  // Absente si l'etat du compte cree n'autorisait pas l'ouverture d'une
  // session. Ne peut pas se produire aujourd'hui — un compte nait
  // `unverified` — mais le type le dit plutot que de le supposer.
  readonly session: SessionOuverte | undefined
}

export interface SessionEtablie {
  readonly chargeUtile: ChargeUtileSession
  readonly session: SessionOuverte
}

function codeDe(erreur: unknown): number | undefined {
  return typeof erreur === 'object' && erreur !== null && 'code' in erreur
    ? Number((erreur as { code: unknown }).code)
    : undefined
}

// Les situations d'un compte sont **derivees a chaque lecture**, jamais
// persistees : une copie ferait survivre un bandeau apres la disparition de sa
// cause. Les deux autres situations declarees — propagation de paiement, fin de
// periode — n'ont pas encore de producteur ; leur place dans l'ordre de
// priorite est deja tranchee dans `shared/session.ts`.
function situationsDe(etat: EtatCompte): readonly SituationCompte[] {
  return etat === 'unverified' ? ['compteNonVerifie'] : []
}

// Proprietaire du module `auth` cote comptes. Aucune regle metier ne descend
// dans le controller : il traduit HTTP, rien de plus.
export class AuthService {
  private readonly motsDePasse: MotDePasseService
  private readonly sessions: SessionService

  constructor(motsDePasse: MotDePasseService, sessions: SessionService = new SessionService()) {
    this.motsDePasse = motsDePasse
    this.sessions = sessions
  }

  async creerCompte(entree: EntreeInscription): Promise<CompteCree> {
    // Le hachage precede l'ecriture. L'inverse rendrait le cout du hachage
    // dependant de l'existence du compte, ce qui laisse mesurer si une adresse
    // est prise sans jamais lire la reponse.
    const passwordHash = await this.motsDePasse.hacher(entree.motDePasse)

    // Aucune lecture prealable : l'unicite vient de l'index sur la forme
    // normalisee de l'adresse, et sa violation se **traduit** en reponse. Un
    // « lire puis creer » laisserait passer deux inscriptions concurrentes,
    // que rien d'autre n'arreterait.
    const utilisateur = await modeleUser()
      .create({ displayName: entree.displayName, email: entree.email, passwordHash })
      .catch((erreur: unknown) => {
        if (codeDe(erreur) === CLE_DUPLIQUEE) {
          throw new ErreurApi('ADRESSE_DEJA_UTILISEE')
        }

        throw erreur
      })

    const session = await this.sessions.ouvrir({
      id: utilisateur._id,
      accountState: utilisateur.accountState,
    })

    const situations = situationsDe(utilisateur.accountState)

    return {
      chargeUtile: {
        id: utilisateur.id as string,
        displayName: utilisateur.displayName,
        accountState: utilisateur.accountState,
        situations,
        // Servie seulement quand une situation la rend necessaire. L'adresse
        // telle qu'elle a ete saisie, pas sa forme normalisee : le bandeau la
        // nomme pour que son destinataire la reconnaisse, et une adresse mise
        // en minuscules ne se reconnait pas toujours.
        ...(situations.includes('compteNonVerifie')
          ? { adresseAVerifier: utilisateur.email }
          : {}),
      },
      session,
    }
  }

  // Authentifie un utilisateur par son adresse et mot de passe.
  // Reponse strictement uniforme contre l'enumeration et timing-safe via hash factice.
  async connecter(entree: EntreeConnexion): Promise<SessionEtablie> {
    const emailNormalise = normaliserEmail(entree.email)
    const utilisateur = await modeleUser()
      .findOne({ normalizedEmail: emailNormalise })
      .select('+passwordHash')

    if (!utilisateur) {
      // Comparison factice pour neutraliser l'attaque temporelle
      await this.motsDePasse.verifierFactice(entree.motDePasse)
      throw new ErreurApi('IDENTIFIANTS_INVALIDES')
    }

    const motDePasseValide = await this.motsDePasse.verifier(
      utilisateur.passwordHash,
      entree.motDePasse,
    )

    if (!motDePasseValide) {
      throw new ErreurApi('IDENTIFIANTS_INVALIDES')
    }

    if (!etatSuffit(utilisateur.accountState, 'unverified')) {
      throw new ErreurApi('IDENTIFIANTS_INVALIDES')
    }

    const session = await this.sessions.ouvrir({
      id: utilisateur._id,
      accountState: utilisateur.accountState,
    })

    if (session === undefined) {
      throw new ErreurApi('IDENTIFIANTS_INVALIDES')
    }

    const situations = situationsDe(utilisateur.accountState)

    return {
      chargeUtile: {
        id: utilisateur.id as string,
        displayName: utilisateur.displayName,
        accountState: utilisateur.accountState,
        situations,
        ...(situations.includes('compteNonVerifie')
          ? { adresseAVerifier: utilisateur.email }
          : {}),
      },
      session,
    }
  }

  // Renvoie la charge utile correspondant a un principal authentifie.
  async obtenirChargeUtile(principal: Principal): Promise<ChargeUtileSession> {
    const utilisateur = await modeleUser().findById(principal.id)

    if (!utilisateur || !etatSuffit(utilisateur.accountState, 'unverified')) {
      throw new ErreurApi('NON_AUTHENTIFIE')
    }

    const situations = situationsDe(utilisateur.accountState)

    return {
      id: utilisateur.id as string,
      displayName: utilisateur.displayName,
      accountState: utilisateur.accountState,
      situations,
      ...(situations.includes('compteNonVerifie')
        ? { adresseAVerifier: utilisateur.email }
        : {}),
    }
  }

  // Ferme la session en base.
  async deconnecter(jeton: string): Promise<void> {
    await this.sessions.fermer(jeton)
  }
}
