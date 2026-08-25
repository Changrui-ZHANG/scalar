import mongoose, { type Model, type Schema } from 'mongoose'
import {
  NOM_MODELE_UTILISATEUR,
  schemaUtilisateur,
  type Utilisateur,
} from './utilisateur.model.ts'

interface Declaration {
  readonly nom: string
  readonly schema: Schema
}

const DECLARATIONS: readonly Declaration[] = [
  { nom: NOM_MODELE_UTILISATEUR, schema: schemaUtilisateur },
]

// Un modele est enregistre une seule fois, ici. Un service le recoit, il ne
// l'enregistre pas. Rejouer l'enregistrement est sans effet : mongoose leve
// OverwriteModelError sur un second `model(nom, schema)`.
export function enregistrerModeles(): void {
  for (const { nom, schema } of DECLARATIONS) {
    const existant = mongoose.models[nom]

    if (!existant) {
      mongoose.model(nom, schema)
      continue
    }

    // Meme nom, autre schema : le modele en place ne porte pas forcement
    // `autoIndex: false`, et le silence ferait travailler tout le backend sur
    // une definition qu'il n'a pas declaree.
    if (existant.schema !== schema) {
      throw new Error(`Le modele ${nom} est deja enregistre avec un autre schema.`)
    }
  }
}

export function modeleUtilisateur(): Model<Utilisateur> {
  enregistrerModeles()

  return mongoose.model<Utilisateur>(NOM_MODELE_UTILISATEUR)
}
