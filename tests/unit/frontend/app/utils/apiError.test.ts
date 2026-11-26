import { describe, expect, it } from 'vitest'
import {
  apiErrorMessage,
  apiErrorStatus,
  safeRedirect,
} from '../../../../../frontend/app/utils/apiError'

describe('utils/apiError', () => {
  it('reprend le message de l’API quand elle en donne un', () => {
    const error = { statusCode: 401, data: { error: 'Email ou mot de passe incorrect.' } }
    expect(apiErrorStatus(error)).toBe(401)
    expect(apiErrorMessage(error, 'repli')).toBe('Email ou mot de passe incorrect.')
  })

  it('utilise le message de repli si l’API n’en donne pas', () => {
    expect(apiErrorMessage({ statusCode: 500 }, 'repli')).toBe('repli')
  })

  it('signale un serveur injoignable quand il n’y a pas de statut', () => {
    expect(apiErrorStatus(new Error('fetch failed'))).toBeNull()
    expect(apiErrorMessage(new Error('fetch failed'), 'repli')).toContain('ne répond pas')
  })

  it('ne redirige que vers un chemin du site', () => {
    expect(safeRedirect('/parcours/javascript')).toBe('/parcours/javascript')
    expect(safeRedirect('//pirate.example')).toBe('/')
    expect(safeRedirect('https://pirate.example')).toBe('/')
    expect(safeRedirect(undefined)).toBe('/')
  })
})
