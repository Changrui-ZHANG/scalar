import mongoose from 'mongoose'
import { INDEX_REQUIS, type IndexRequis } from '../config/index-requis.ts'
import { enregistrerModeles } from '../models/index.ts'

// Codes MongoDB traites explicitement.
const COLLECTION_INEXISTANTE = 26
const OPTIONS_INDEX_EN_CONFLIT = 85
const CLES_INDEX_EN_CONFLIT = 86
const CLE_DUPLIQUEE = 11000

interface IndexReel {
  name?: string
  key?: unknown
  unique?: boolean
  sparse?: boolean
  partialFilterExpression?: unknown
  collation?: unknown
}

// Un message d'erreur du pilote recopie parfois la chaine de connexion, avec
// ses identifiants. Aucun journal ne doit la porter. La premiere expression
// couvre aussi les formes que le pilote signale sans schema reconnu, tant
// qu'elles portent un `utilisateur:motdepasse@`.
export function masquerUri(texte: string): string {
  return texte
    .replace(/[a-z0-9+.-]*:\/\/[^\s@/]*@\S+/gi, '[uri masquee]')
    .replace(/mongodb(\+srv)?:\/\/\S+/gi, '[uri masquee]')
}

function codeDe(erreur: unknown): number | undefined {
  return typeof erreur === 'object' && erreur !== null && 'code' in erreur
    ? Number((erreur as { code: unknown }).code)
    : undefined
}

function memesCles(reelles: unknown, attendues: IndexRequis['cles']): boolean {
  return JSON.stringify(reelles) === JSON.stringify(attendues)
}

export class BaseDonneesService {
  async connecter(uri: string, delaiSelectionMs = 10_000): Promise<void> {
    enregistrerModeles()

    await mongoose.connect(uri, {
      autoIndex: false,
      autoCreate: false,
      serverSelectionTimeoutMS: delaiSelectionMs,
    })
  }

  async deconnecter(): Promise<void> {
    await mongoose.disconnect()
  }

  // Idempotente : `createIndex` sur un index deja present et identique ne fait
  // rien. Seul chemin de creation. Les deux echecs previsibles d'un deploiement
  // sont nommes, parce qu'ils demandent une action humaine differente.
  async creerIndex(): Promise<readonly string[]> {
    const base = this.base()

    for (const requis of INDEX_REQUIS) {
      const chemin = `${requis.collection}.${requis.nom}`

      try {
        await base
          .collection(requis.collection)
          .createIndex(requis.cles, { name: requis.nom, unique: requis.unique })
      } catch (erreur) {
        const code = codeDe(erreur)

        if (code === OPTIONS_INDEX_EN_CONFLIT || code === CLES_INDEX_EN_CONFLIT) {
          throw new Error(
            `${chemin} — un index de ce nom existe avec d autres options : supprimez-le puis rejouez la commande.`,
          )
        }

        if (code === CLE_DUPLIQUEE) {
          throw new Error(
            `${chemin} — des doublons existent deja : resolvez-les avant de creer l index unique.`,
          )
        }

        throw erreur
      }
    }

    return INDEX_REQUIS.map((requis) => `${requis.collection}.${requis.nom}`)
  }

  // Compare les index reels aux index declares et rend la liste des ecarts.
  // Un index absent, portant d'autres cles, non unique alors qu'il devrait
  // l'etre, ou dont l'unicite est restreinte a un sous-ensemble, est un ecart :
  // l'unicite n'existerait que sur le papier.
  async verifierIndex(): Promise<readonly string[]> {
    const ecarts: string[] = []

    for (const requis of INDEX_REQUIS) {
      const reels = await this.indexReels(requis.collection)
      const reel = reels.find((candidat) => candidat.name === requis.nom)
      const chemin = `${requis.collection}.${requis.nom}`

      if (!reel) {
        ecarts.push(`${chemin} — index requis absent`)
        continue
      }

      if (!memesCles(reel.key, requis.cles)) {
        ecarts.push(`${chemin} — cles inattendues : ${JSON.stringify(reel.key)}`)
      }

      if ((reel.unique === true) !== requis.unique) {
        ecarts.push(
          requis.unique
            ? `${chemin} — index present mais non unique`
            : `${chemin} — index unique alors qu il ne devrait pas l etre`,
        )
      }

      if (requis.unique && (reel.sparse === true || reel.partialFilterExpression || reel.collation)) {
        ecarts.push(`${chemin} — unicite restreinte a un sous-ensemble des documents`)
      }
    }

    return ecarts
  }

  private async indexReels(collection: string): Promise<readonly IndexReel[]> {
    try {
      return await this.base().collection(collection).indexes()
    } catch (erreur) {
      // Sur le code plutot que sur `instanceof` : deux copies du pilote dans
      // l'arbre de dependances donneraient deux classes distinctes.
      if (codeDe(erreur) === COLLECTION_INEXISTANTE) {
        return []
      }

      throw erreur
    }
  }

  private base(): mongoose.mongo.Db {
    const base = mongoose.connection.db

    if (!base) {
      throw new Error('Aucune connexion a la base : appelez connecter() d abord.')
    }

    return base
  }
}
