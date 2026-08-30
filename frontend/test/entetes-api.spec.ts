import { describe, expect, it } from 'vitest'
import { EN_TETE_TRANSFERT } from '@scalar/shared/proxy.ts'
import { A_PROPAGER, entetesAPropager } from '../app/utils/entetes-api'

describe('en-tetes propages par le rendu serveur', () => {
  it('propage le cookie, sans quoi une page rendue au serveur perd la session', () => {
    const entetes = entetesAPropager({ cookie: 'scalar_session=abc' })

    expect(entetes.cookie).toBe('scalar_session=abc')
  })

  it('propage la chaine de transfert, sans quoi l appel compte comme interne', () => {
    const entetes = entetesAPropager({ 'x-forwarded-for': '203.0.113.7' })

    expect(entetes['x-forwarded-for']).toBe('203.0.113.7')
  })

  // Le cas precedent construit son entree lui-meme et passerait donc encore si
  // la liste fermee cessait de nommer l'en-tete du contrat. Celui-ci regarde la
  // liste, seul endroit ou ce couplage existe reellement.
  it('nomme cette chaine depuis le contrat partage, pas depuis une chaine recopiee', () => {
    expect(A_PROPAGER).toContain(EN_TETE_TRANSFERT)
  })

  it('ne propage rien d autre : un `host` recopie casserait le routage', () => {
    const entetes = entetesAPropager({
      cookie: 'scalar_session=abc',
      host: 'localhost:8080',
      authorization: 'Bearer jeton',
      'user-agent': 'vitest',
    })

    expect(Object.keys(entetes)).toEqual(['cookie'])
  })

  it('omet un en-tete absent ou vide plutot que de l envoyer vide', () => {
    expect(entetesAPropager({})).toEqual({})
    expect(entetesAPropager({ cookie: '', 'x-forwarded-for': '   ' })).toEqual({})
  })
})
