import { describe, expect, it } from 'vitest'
import { entetesAPropager } from '../app/utils/entetes-api'

describe('en-tetes propages par le rendu serveur', () => {
  it('propage le cookie, sans quoi une page rendue au serveur perd la session', () => {
    const entetes = entetesAPropager({ cookie: 'scalar_session=abc' })

    expect(entetes.cookie).toBe('scalar_session=abc')
  })

  it('propage la chaine de transfert, sans quoi l appel compte comme interne', () => {
    const entetes = entetesAPropager({ 'x-forwarded-for': '203.0.113.7' })

    expect(entetes['x-forwarded-for']).toBe('203.0.113.7')
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
