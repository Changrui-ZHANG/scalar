import { Schema, type Types } from 'mongoose'
import { QUOTA_OPERATIONS, type QuotaOperation } from '@scalar/shared/quota.ts'
import { NOM_MODELE_USER } from './user.model.ts'

export const NOM_MODELE_QUOTA_COUNTER = 'QuotaCounter'
export const COLLECTION_QUOTA_COUNTERS = 'quotacounters'
export const VERSION_SCHEMA_QUOTA_COUNTER = 1

export { QUOTA_OPERATIONS, type QuotaOperation }

// Un compteur par (userId, operation, period) — l'index unique declare dans
// `shared/index-requis.ts` fait converger toute paire concurrente vers un
// seul document. Aucun comportement ici : la reservation et la liberation
// (AD-14) vivent dans `services/quota.service.ts`, seul ecrivain.
export interface QuotaCounter {
  userId: Types.ObjectId
  operation: QuotaOperation
  // Bucket de periode : le debut de la fenetre glissante, en millisecondes
  // depuis l'epoque (`periodStart` de `shared/quota.ts`). Un nombre, pas une
  // date, parce que c'est une cle d'egalite exacte, jamais une valeur comparee
  // par ordre.
  period: number
  count: number
  schemaVersion: number
}

export const schemaQuotaCounter = new Schema<QuotaCounter>(
  {
    userId: { type: Schema.Types.ObjectId, ref: NOM_MODELE_USER, required: true },
    operation: { type: String, required: true, enum: [...QUOTA_OPERATIONS] },
    period: { type: Number, required: true },
    count: { type: Number, required: true, default: 0 },
    schemaVersion: { type: Number, required: true, default: VERSION_SCHEMA_QUOTA_COUNTER },
  },
  {
    collection: COLLECTION_QUOTA_COUNTERS,
    // Aucun index ni collection cree implicitement : `creer-index` est le seul
    // chemin de creation, et le demarrage verifie le resultat.
    autoIndex: false,
    autoCreate: false,
    timestamps: true,
  },
)
