import { describe, expect, it } from 'vitest'

import { parseConfig } from './config.ts'

describe('parseConfig', () => {
  it('applique les valeurs par défaut d’avant la refonte', () => {
    const config = parseConfig({})

    expect(config.PORT).toBe(3001)
    expect(config.LOG_LEVEL).toBe('info')
    expect(config.CONTENT_SOURCE).toBe('database')
    expect(config.DATABASE_URL).toBeUndefined()
    expect(config.SEED_ON_EMPTY).toBe(true)
    expect(config.PISTON_URL).toBe('http://piston:2000/api/v2')
    expect(config.PISTON_NODE_VERSION).toBe('20.11.1')
  })

  it('convertit les chaînes de l’environnement', () => {
    const config = parseConfig({ PORT: '4000', SEED_ON_EMPTY: 'false', CONTENT_SOURCE: 'mock' })

    expect(config.PORT).toBe(4000)
    expect(config.SEED_ON_EMPTY).toBe(false)
    expect(config.CONTENT_SOURCE).toBe('mock')
  })

  it.each([
    ['CONTENT_SOURCE', 'mongo'],
    ['PORT', 'abc'],
    ['LOG_LEVEL', 'bavard'],
    ['SEED_ON_EMPTY', 'peut-être'],
    ['PISTON_URL', 'pas une url'],
  ])('refuse %s=%s en nommant la variable', (name, value) => {
    expect(() => parseConfig({ [name]: value })).toThrow(
      new RegExp(`Configuration invalide[\\s\\S]*${name}`),
    )
  })
})
