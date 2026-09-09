import {
  periodEnd,
  periodStart,
  PLAFONDS_QUOTA,
  type QuotaOperation,
  type QuotaReservation,
} from '@scalar/shared/quota.ts'
import { modeleQuotaCounter } from '../models/index.ts'
import { DUPLICATE_KEY_CODE, mongoErrorCode } from './erreur-mongo.util.ts'

// Proprietaire du module `quota` (AD-14). Deux ecritures, jamais une lecture
// suivie d'une ecriture : la premiere garantit l'existence du compteur de la
// periode courante, la seconde l'incremente sous une garde conditionnelle —
// le meme principe de fermeture par ecriture que l'index unique d'AD-9.
export class QuotaService {
  async reserve(userId: string, operation: QuotaOperation): Promise<QuotaReservation> {
    const plafond = PLAFONDS_QUOTA[operation]
    const bucket = periodStart(new Date(), plafond.fenetreMs)

    // Premiere ecriture : cree le compteur de cette periode s'il n'existe pas
    // encore, sans jamais l'incrementer. Une creation concurrente sur la meme
    // cle rencontre l'index unique (userId, operation, period) plutot qu'une
    // fenetre de lecture — la violation est attendue et n'est pas une erreur.
    await modeleQuotaCounter()
      .updateOne(
        { userId, operation, period: bucket },
        { $setOnInsert: { userId, operation, period: bucket, count: 0 } },
        { upsert: true },
      )
      .catch((erreur: unknown) => {
        if (mongoErrorCode(erreur) !== DUPLICATE_KEY_CODE) {
          throw erreur
        }
      })

    // Deuxieme ecriture : incrementation conditionnelle sous garde. Un
    // resultat nul veut dire que la garde a echoue — le plafond est deja
    // atteint pour cette periode — jamais qu'une erreur s'est produite.
    const reserve = await modeleQuotaCounter().findOneAndUpdate(
      { userId, operation, period: bucket, count: { $lt: plafond.maximum } },
      { $inc: { count: 1 } },
    )

    if (!reserve) {
      return { granted: false, maximum: plafond.maximum, resetAt: periodEnd(bucket, plafond.fenetreMs) }
    }

    return { granted: true, period: bucket }
  }

  // Rend un credit reserve. Gardee par `count: { $gt: 0 }`, comme partout
  // ailleurs dans ce module : une double liberation ne fait jamais passer un
  // compteur sous zero.
  async release(userId: string, operation: QuotaOperation, period: number): Promise<void> {
    await modeleQuotaCounter().updateOne(
      { userId, operation, period, count: { $gt: 0 } },
      { $inc: { count: -1 } },
    )
  }
}
