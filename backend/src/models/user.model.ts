import { Schema } from 'mongoose'
import { ETATS_COMPTE, type EtatCompte } from '@scalar/shared/compte.ts'
import {
  canoniserEmail,
  LONGUEUR_MAX_EMAIL,
  LONGUEUR_MAX_NOM_AFFICHE,
} from '@scalar/shared/inscription.ts'

// Le vocabulaire d'entite est en anglais, au singulier, et se declare dans
// `shared/collections.ts`. Les identifiants internes de ce depot restent en
// francais ; seul ce qui s'ecrit en base est contraint, parce que seul cela
// coute une migration.
export const NOM_MODELE_USER = 'User'
export const COLLECTION_USERS = 'users'
export const VERSION_SCHEMA_USER = 1

// Les deux longueurs viennent de `shared` : c'est le meme nombre que le schema
// d'entree applique au bord, et le recopier ici ferait exister une saisie
// acceptee par la validation puis refusee par le modele. Un index MongoDB
// refuse par ailleurs une cle de plus de ~1024 octets, ce que 254 — longueur
// maximale d'une adresse de courriel — laisse loin derriere.

// L'etat de compte se declare dans `shared` : il voyage dans la charge utile
// de session, donc les deux cotes le lisent. Reexporte ici parce que le modele
// est l'endroit ou l'on vient chercher la forme d'un `User`.
export { ETATS_COMPTE, type EtatCompte }

export interface User {
  displayName: string
  email: string
  normalizedEmail: string
  accountState: EtatCompte
  passwordHash: string
  sessionsInvalidBefore: Date
  schemaVersion: number
}

// La cle d'unicite est stockee dans son propre champ, normalisee. C'est ce
// champ qui porte l'index unique, jamais `email` tel que saisi.
// La canonicalisation vient de `shared`, la meme que celle qu'applique le
// schema d'entree : sans elle, deux adresses canoniquement equivalentes —
// formes composee et decomposee, caracteres pleine largeur — produiraient deux
// cles differentes et passeraient sous l'index unique. La mise en minuscules
// est propre a la cle, elle n'atteint pas l'adresse conservee.
export function normaliserEmail(email: string): string {
  return canoniserEmail(email).toLowerCase()
}

export const schemaUser = new Schema<User>(
  {
    displayName: { type: String, required: true, trim: true, maxlength: LONGUEUR_MAX_NOM_AFFICHE },
    email: { type: String, required: true, trim: true, maxlength: LONGUEUR_MAX_EMAIL },
    normalizedEmail: { type: String, required: true, maxlength: LONGUEUR_MAX_EMAIL },
    accountState: { type: String, required: true, enum: [...ETATS_COMPTE], default: 'unverified' },
    // `select: false` au niveau du schema : le hachage n'est plus selectionne
    // par defaut nulle part, donc aucune projection oubliee ne peut le servir.
    // C'est le filet sous le contrat — pas l'inverse : la charge utile de
    // session ne le declare pas non plus.
    passwordHash: { type: String, required: true, select: false },
    // Marqueur monotone de revocation : toute session ouverte **avant** cette
    // date est refusee a la lecture. Une seule ecriture atomique revoque tout,
    // sans qu'aucun document de session n'ait a etre supprime — la suppression
    // devient un nettoyage, jamais le mecanisme.
    //
    // Epoque zero par defaut, et non l'instant de creation : la session ouverte
    // dans la meme milliseconde que le compte doit rester valide.
    sessionsInvalidBefore: { type: Date, required: true, default: () => new Date(0) },
    schemaVersion: { type: Number, required: true, default: VERSION_SCHEMA_USER },
  },
  {
    collection: COLLECTION_USERS,
    // Aucun index ni collection cree implicitement : `creer-index` est le seul
    // chemin de creation, et le demarrage verifie le resultat.
    autoIndex: false,
    autoCreate: false,
    timestamps: true,
  },
)

// Sur `save()` et `create()`. Le champ absent laisse la validation parler :
// sans la garde, `.trim()` sur `undefined` leverait un TypeError au lieu d'une
// erreur de validation nommant le champ manquant.
schemaUser.pre('validate', function () {
  if (typeof this.email === 'string') {
    this.normalizedEmail = normaliserEmail(this.email)
  }
})

// Sur les chemins de mise a jour, que le hook de validation ne voit pas. Sans
// cela, changer `email` laisse `normalizedEmail` sur l'ancienne valeur :
// l'index unique garderait alors un champ qui ne correspond plus au document,
// et un upsert inserirait un document sans cle normalisee du tout.
schemaUser.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function () {
  const miseAJour = this.getUpdate() as {
    email?: unknown
    $set?: { email?: unknown }
    $setOnInsert?: { email?: unknown }
  } | null

  const email = miseAJour?.$set?.email ?? miseAJour?.$setOnInsert?.email ?? miseAJour?.email

  if (typeof email === 'string') {
    this.set('normalizedEmail', normaliserEmail(email))
  }
})
