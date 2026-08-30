import { Schema } from 'mongoose'

// Le vocabulaire d'entite est en anglais, au singulier, et se declare dans
// `contracts/collections.ts`. Les identifiants internes de ce depot restent en
// francais ; seul ce qui s'ecrit en base est contraint, parce que seul cela
// coute une migration.
export const NOM_MODELE_USER = 'User'
export const COLLECTION_USERS = 'users'
export const VERSION_SCHEMA_USER = 1

// Un index MongoDB refuse une cle de plus de ~1024 octets : sans borne, une
// saisie trop longue devient un echec d'insertion au lieu d'une erreur de
// validation. 254 est la longueur maximale d'une adresse de courriel.
const LONGUEUR_MAX_EMAIL = 254
const LONGUEUR_MAX_NOM_AFFICHE = 100

// Un etat de compte n'est pas un role : les deux axes restent distincts.
// Tableau constant plutot qu'une enumeration TypeScript — Node retire les
// types sans compiler et rejetterait `enum` au demarrage.
export const ETATS_COMPTE = ['unverified', 'active', 'suspended', 'erased'] as const

export type EtatCompte = (typeof ETATS_COMPTE)[number]

export interface User {
  displayName: string
  email: string
  normalizedEmail: string
  accountState: EtatCompte
  schemaVersion: number
}

// La cle d'unicite est stockee dans son propre champ, normalisee. C'est ce
// champ qui porte l'index unique, jamais `email` tel que saisi.
// NFKC d'abord : sans elle, deux adresses canoniquement equivalentes (formes
// composee et decomposee, caracteres pleine largeur) produisent deux cles
// differentes et passent sous l'index unique.
export function normaliserEmail(email: string): string {
  return email
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .toLowerCase()
}

export const schemaUser = new Schema<User>(
  {
    displayName: { type: String, required: true, trim: true, maxlength: LONGUEUR_MAX_NOM_AFFICHE },
    email: { type: String, required: true, trim: true, maxlength: LONGUEUR_MAX_EMAIL },
    normalizedEmail: { type: String, required: true, maxlength: LONGUEUR_MAX_EMAIL },
    accountState: { type: String, required: true, enum: [...ETATS_COMPTE], default: 'unverified' },
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
