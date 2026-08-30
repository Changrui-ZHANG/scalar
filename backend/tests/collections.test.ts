import { beforeAll, describe, expect, it } from 'vitest'
import mongoose from 'mongoose'
import { COLLECTIONS, NOMS_COLLECTIONS } from '@scalar/shared/collections.ts'
import { enregistrerModeles } from '../src/models/index.ts'

beforeAll(() => {
  enregistrerModeles()
})

// Cette cloture etait annoncee testable depuis le debut sans l'etre. Le defaut
// qu'elle attrape est reel : le modele s'est appele `Utilisateur` sur la
// collection `utilisateurs` pendant des semaines, sans que rien ne le dise.
describe('cloture des collections', () => {
  it('n enregistre aucun modele absent de la table normative', () => {
    const enregistres = Object.keys(mongoose.models)
    const horsTable = enregistres.filter((nom) => !NOMS_COLLECTIONS.includes(nom))

    expect(horsTable).toEqual([])
  })

  it('declare chaque collection une seule fois, avec un module proprietaire', () => {
    expect(new Set(NOMS_COLLECTIONS).size).toBe(NOMS_COLLECTIONS.length)

    for (const collection of COLLECTIONS) {
      expect(collection.module).not.toBe('')
    }
  })

  // Pas de controle du singulier : `Progress` est un mot anglais singulier qui
  // finit par « s ». Une heuristique orthographique signalerait un nom correct,
  // ce qui est pire que pas de test du tout. Seule la forme est verifiee.
  it('nomme les collections en PascalCase, sans separateur', () => {
    for (const nom of NOMS_COLLECTIONS) {
      expect(nom).toMatch(/^[A-Z][A-Za-z]*$/)
    }
  })
})
