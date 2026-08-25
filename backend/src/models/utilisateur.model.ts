import { Schema } from 'mongoose'

export const NOM_MODELE_UTILISATEUR = 'Utilisateur'
export const COLLECTION_UTILISATEURS = 'utilisateurs'
export const VERSION_SCHEMA_UTILISATEUR = 1

// Un index MongoDB refuse une cle de plus de ~1024 octets : sans borne, une
// saisie trop longue devient un echec d'insertion au lieu d'une erreur de
// validation. 254 est la longueur maximale d'une adresse de courriel.
const LONGUEUR_MAX_ADRESSE = 254
const LONGUEUR_MAX_NOM = 100

// Un etat de compte n'est pas un role : les deux axes restent distincts.
// Tableau constant plutot qu'une enumeration TypeScript — Node retire les
// types sans compiler et rejetterait `enum` au demarrage.
export const ETATS_UTILISATEUR = ['non-verifie', 'actif', 'suspendu', 'efface'] as const

export type EtatUtilisateur = (typeof ETATS_UTILISATEUR)[number]

export interface Utilisateur {
  nomAffiche: string
  adresse: string
  adresseNormalisee: string
  etat: EtatUtilisateur
  versionSchema: number
}

// La cle d'unicite est stockee dans son propre champ, normalisee. C'est ce
// champ qui porte l'index unique, jamais `adresse` telle que saisie.
// NFKC d'abord : sans elle, deux adresses canoniquement equivalentes (formes
// composee et decomposee, caracteres pleine largeur) produisent deux cles
// differentes et passent sous l'index unique.
export function normaliserAdresse(adresse: string): string {
  return adresse
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .toLowerCase()
}

export const schemaUtilisateur = new Schema<Utilisateur>(
  {
    nomAffiche: { type: String, required: true, trim: true, maxlength: LONGUEUR_MAX_NOM },
    adresse: { type: String, required: true, trim: true, maxlength: LONGUEUR_MAX_ADRESSE },
    adresseNormalisee: { type: String, required: true, maxlength: LONGUEUR_MAX_ADRESSE },
    etat: { type: String, required: true, enum: [...ETATS_UTILISATEUR], default: 'non-verifie' },
    versionSchema: { type: Number, required: true, default: VERSION_SCHEMA_UTILISATEUR },
  },
  {
    collection: COLLECTION_UTILISATEURS,
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
schemaUtilisateur.pre('validate', function () {
  if (typeof this.adresse === 'string') {
    this.adresseNormalisee = normaliserAdresse(this.adresse)
  }
})

// Sur les chemins de mise a jour, que le hook de validation ne voit pas. Sans
// cela, changer `adresse` laisse `adresseNormalisee` sur l'ancienne valeur :
// l'index unique garderait alors un champ qui ne correspond plus au document,
// et un upsert inserirait un document sans cle normalisee du tout.
schemaUtilisateur.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function () {
  const miseAJour = this.getUpdate() as {
    adresse?: unknown
    $set?: { adresse?: unknown }
    $setOnInsert?: { adresse?: unknown }
  } | null

  const adresse =
    miseAJour?.$set?.adresse ?? miseAJour?.$setOnInsert?.adresse ?? miseAJour?.adresse

  if (typeof adresse === 'string') {
    this.set('adresseNormalisee', normaliserAdresse(adresse))
  }
})
