import { Schema, type Types } from 'mongoose'
import { NOM_MODELE_USER } from './user.model.ts'

export const NOM_MODELE_SESSION = 'Session'
export const COLLECTION_SESSIONS = 'sessions'
export const VERSION_SCHEMA_SESSION = 1

// Un modele ne porte aucun comportement : ni l'ouverture, ni la lecture, ni la
// revocation n'ont d'entree ici. Elles vivent dans `services/session.service.ts`,
// seul ecrivain de cette collection.
export interface Session {
  user: Types.ObjectId
  tokenHash: string
  expiresAt: Date
  lastSeenAt: Date
  schemaVersion: number
  // Pose par `timestamps` ; declare ici parce que la lecture le compare au
  // marqueur de revocation, et qu'un champ non declare ne se lit pas en typage.
  createdAt: Date
}

export const schemaSession = new Schema<Session>(
  {
    user: { type: Schema.Types.ObjectId, ref: NOM_MODELE_USER, required: true },
    // L'empreinte du jeton, jamais le jeton. Un vol de sauvegarde ne rend
    // alors aucune session utilisable. `select: false` comme le hachage de mot
    // de passe : exclu au niveau du modele, donc absent de toute sortie qu'une
    // projection aurait oublie de restreindre.
    tokenHash: { type: String, required: true, select: false },
    // Expiration absolue, decidee a l'ouverture. L'index TTL declare dans
    // `shared/index-requis.ts` balaie la collection, mais le chemin de lecture
    // compare lui-meme : le balayage a une granularite de l'ordre de la
    // minute, et une session expiree resterait sinon utilisable jusque-la.
    expiresAt: { type: Date, required: true },
    lastSeenAt: { type: Date, required: true },
    schemaVersion: { type: Number, required: true, default: VERSION_SCHEMA_SESSION },
  },
  {
    collection: COLLECTION_SESSIONS,
    // Aucun index ni collection cree implicitement : `creer-index` est le seul
    // chemin de creation, et le demarrage verifie le resultat.
    autoIndex: false,
    autoCreate: false,
    // `createdAt` n'est pas decoratif : c'est lui que le marqueur monotone de
    // revocation porte par `User` compare, et donc lui qui decide qu'une
    // session anterieure a un changement de mot de passe cesse d'etre lue.
    timestamps: true,
  },
)
