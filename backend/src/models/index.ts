import mongoose, { type Model, type Schema } from 'mongoose'
import { NOM_MODELE_SESSION, schemaSession, type Session } from './session.model.ts'
import { NOM_MODELE_USER, normaliserEmail, schemaUser, type User } from './user.model.ts'

export { normaliserEmail }

interface Declaration {
  readonly nom: string
  readonly schema: Schema
}

const DECLARATIONS: readonly Declaration[] = [
  { nom: NOM_MODELE_USER, schema: schemaUser },
  { nom: NOM_MODELE_SESSION, schema: schemaSession },
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

export function modeleUser(): Model<User> {
  enregistrerModeles()

  return mongoose.model<User>(NOM_MODELE_USER)
}

export function modeleSession(): Model<Session> {
  enregistrerModeles()

  return mongoose.model<Session>(NOM_MODELE_SESSION)
}
