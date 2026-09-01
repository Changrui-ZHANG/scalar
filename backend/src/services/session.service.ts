import { createHash, randomBytes } from 'node:crypto'
import type { Types } from 'mongoose'
import { etatSuffit, type EtatCompte } from '@scalar/shared/compte.ts'
import { DUREE_SESSION_MS } from '@scalar/shared/limites.ts'
import { OCTETS_JETON_SESSION, type Principal } from '@scalar/shared/session.ts'
import { modeleSession, modeleUser } from '../models/index.ts'

// Seul ecrivain de la collection `sessions`. La regle d'ouverture, la regle de
// lecture et la revocation vivent ici — jamais dans un middleware, qui se
// contente d'appeler et d'attacher.

export interface SessionOuverte {
  // Le jeton en clair. Il n'existe qu'ici et dans le cookie : ni la base, ni un
  // corps de reponse, ni un journal ne le voient. Le service ne peut plus le
  // reconstituer une fois cette valeur rendue.
  readonly jeton: string
  readonly expireA: Date
}

// L'empreinte est un SHA-256, pas un argon2. Le jeton n'est pas un secret
// choisi par un humain mais 32 octets d'alea : il n'y a pas de dictionnaire a
// ralentir, et il faut pouvoir retrouver la session par sa cle a chaque
// requete. Un hachage lent ferait payer sa lenteur a toutes les lectures sans
// rien ajouter.
function empreinte(jeton: string): string {
  return createHash('sha256').update(jeton).digest('hex')
}

export class SessionService {
  // Refuse d'ouvrir une session sur un etat qui n'a pas le droit d'en avoir
  // une. Un compte suspendu voit ses sessions revoquees et ne peut pas en
  // rouvrir ; ses donnees restent intactes.
  async ouvrir(utilisateur: {
    id: Types.ObjectId
    accountState: EtatCompte
  }): Promise<SessionOuverte | undefined> {
    if (!etatSuffit(utilisateur.accountState, 'unverified')) {
      return undefined
    }

    // base64url : l'alphabet ne contient aucun caractere qu'un en-tete
    // `Cookie` obligerait a echapper, ce qui evite d'avoir a decider quoi
    // faire d'une valeur percent-encodee a la relecture.
    const jeton = randomBytes(OCTETS_JETON_SESSION).toString('base64url')
    const maintenant = new Date()
    const expireA = new Date(maintenant.getTime() + DUREE_SESSION_MS)

    await modeleSession().create({
      user: utilisateur.id,
      tokenHash: empreinte(jeton),
      expiresAt: expireA,
      lastSeenAt: maintenant,
    })

    return { jeton, expireA }
  }

  // Rend le principal, ou `undefined`. Les trois facons de ne pas avoir de
  // session — absente, expiree, revoquee — se confondent volontairement en une
  // seule : la difference n'interesse aucun appelant, et la distinguer dirait a
  // un porteur de jeton vole que son jeton a existe.
  async lire(jeton: string): Promise<Principal | undefined> {
    const session = await modeleSession().findOne({ tokenHash: empreinte(jeton) })

    if (!session) {
      return undefined
    }

    // L'expiration est verifiee ici, jamais deleguee au balayage TTL : sa
    // granularite est de l'ordre de la minute, et une session expiree resterait
    // sinon utilisable jusqu'au prochain passage.
    if (session.expiresAt.getTime() <= Date.now()) {
      return undefined
    }

    const utilisateur = await modeleUser().findById(session.user)

    if (!utilisateur) {
      return undefined
    }

    // Marqueur monotone : toute session ouverte avant lui est refusee, sans
    // qu'aucun document ait ete supprime. La comparaison est stricte sur le
    // « avant », pour que la session ouverte dans la meme milliseconde qu'une
    // ecriture du marqueur — la session courante d'un changement de mot de
    // passe — survive.
    if (session.createdAt.getTime() < utilisateur.sessionsInvalidBefore.getTime()) {
      return undefined
    }

    return { id: utilisateur.id as string, accountState: utilisateur.accountState }
  }

  // Supprime la session correspondant a l'empreinte du jeton lors d'une deconnexion explicite.
  async fermer(jeton: string): Promise<void> {
    await modeleSession().deleteOne({ tokenHash: empreinte(jeton) })
  }
}
