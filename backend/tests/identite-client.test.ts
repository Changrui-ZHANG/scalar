import { describe, expect, it } from 'vitest'
import {
  LONGUEUR_PSEUDONYME,
  SAUTS_PROXY_DE_CONFIANCE,
} from '../src/contracts/proxy.ts'
import { resoudreIdentiteClient } from '../src/middlewares/identite-client.middleware.ts'

const SECRET = 'secret-de-test-de-trente-deux-car'
const AUTRE_SECRET = 'autre-secret-de-trente-deux-carac'

describe('nombre de sauts de proxy de confiance', () => {
  it('est declare dans contracts, pas devine a la lecture', () => {
    expect(SAUTS_PROXY_DE_CONFIANCE).toBeGreaterThanOrEqual(1)
    expect(Number.isInteger(SAUTS_PROXY_DE_CONFIANCE)).toBe(true)
  })
})

describe('resolution de l identite de client', () => {
  it('retient l entree designee par le nombre de sauts declare', () => {
    const identite = resoudreIdentiteClient('203.0.113.7', SECRET)

    expect(identite.nature).toBe('publique')
  })

  it('ignore l en-tete le plus a gauche quand le client en a injecte un', () => {
    // Le client envoie `1.2.3.4`, Traefik ajoute l'adresse reelle a droite.
    // Retenir la plus a gauche laisserait n'importe qui choisir son seau.
    const usurpee = resoudreIdentiteClient('1.2.3.4', SECRET)
    const reelle = resoudreIdentiteClient('1.2.3.4, 203.0.113.7', SECRET)
    const seule = resoudreIdentiteClient('203.0.113.7', SECRET)

    expect(reelle).toEqual(seule)
    expect(reelle).not.toEqual(usurpee)
  })

  it('resiste a une chaine de transfert arbitrairement longue', () => {
    const bourrage = Array.from({ length: 50 }, (_, index) => `10.0.0.${index}`).join(', ')
    const reelle = resoudreIdentiteClient(`${bourrage}, 203.0.113.7`, SECRET)

    expect(reelle).toEqual(resoudreIdentiteClient('203.0.113.7', SECRET))
  })

  it('traite comme interne un appel sans chaine de transfert', () => {
    expect(resoudreIdentiteClient(undefined, SECRET).nature).toBe('interne')
    expect(resoudreIdentiteClient('', SECRET).nature).toBe('interne')
    expect(resoudreIdentiteClient('  ,  ', SECRET).nature).toBe('interne')
  })

  it('accepte la forme repetee de l en-tete', () => {
    const repetee = resoudreIdentiteClient(['1.2.3.4', '203.0.113.7'], SECRET)

    expect(repetee).toEqual(resoudreIdentiteClient('1.2.3.4, 203.0.113.7', SECRET))
  })
})

describe('pseudonymisation', () => {
  it('ne laisse apparaitre aucune adresse en clair', () => {
    const identite = resoudreIdentiteClient('203.0.113.7', SECRET)

    expect(JSON.stringify(identite)).not.toContain('203.0.113.7')
  })

  it('est stable pour une meme adresse, donc utilisable comme seau', () => {
    const premiere = resoudreIdentiteClient('203.0.113.7', SECRET)
    const seconde = resoudreIdentiteClient('203.0.113.7', SECRET)

    expect(premiere).toEqual(seconde)
  })

  it('separe deux adresses distinctes', () => {
    const une = resoudreIdentiteClient('203.0.113.7', SECRET)
    const autre = resoudreIdentiteClient('203.0.113.8', SECRET)

    expect(une).not.toEqual(autre)
  })

  it('depend du secret, donc n est pas retrouvable par table precalculee', () => {
    const une = resoudreIdentiteClient('203.0.113.7', SECRET)
    const autre = resoudreIdentiteClient('203.0.113.7', AUTRE_SECRET)

    expect(une).not.toEqual(autre)
  })

  it('respecte la longueur declaree', () => {
    const identite = resoudreIdentiteClient('203.0.113.7', SECRET)

    expect(identite.nature === 'publique' && identite.pseudonyme).toHaveLength(
      LONGUEUR_PSEUDONYME,
    )
  })
})
