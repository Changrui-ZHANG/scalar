import { describe, expect, it } from 'vitest'

import { parseConfig } from '../../backend/src/config.ts'

const SECRET = { JWT_SECRET: 'x'.repeat(32) }

describe('parseConfig', () => {
  it('applique les valeurs par défaut d’avant la refonte', () => {
    const config = parseConfig(SECRET)

    expect(config.PORT).toBe(3001)
    expect(config.LOG_LEVEL).toBe('info')
    expect(config.CONTENT_SOURCE).toBe('database')
    expect(config.DATABASE_URL).toBeUndefined()
    expect(config.SEED_ON_EMPTY).toBe(true)
    expect(config.PISTON_URL).toBe('http://piston:2000/api/v2')
    expect(config.PISTON_NODE_VERSION).toBe('20.11.1')
    expect(config.AUTH_COOKIE_SECURE).toBe(true)
    expect(config.AUTH_ATTEMPTS_LIMIT).toBe(10)
  })

  it('lit le compte admin local, facultatif', () => {
    expect(parseConfig(SECRET).ADMIN_EMAIL).toBeUndefined()
    expect(parseConfig(SECRET).ADMIN_PASSWORD).toBeUndefined()

    const config = parseConfig({
      ...SECRET,
      ADMIN_EMAIL: 'test@test.fr',
      ADMIN_PASSWORD: 'test',
    })

    expect(config.ADMIN_EMAIL).toBe('test@test.fr')
    expect(config.ADMIN_PASSWORD).toBe('test')
  })

  it('convertit les chaînes de l’environnement', () => {
    const config = parseConfig({
      ...SECRET,
      PORT: '4000',
      SEED_ON_EMPTY: 'false',
      CONTENT_SOURCE: 'mock',
      AUTH_COOKIE_SECURE: 'false',
    })

    expect(config.PORT).toBe(4000)
    expect(config.SEED_ON_EMPTY).toBe(false)
    expect(config.CONTENT_SOURCE).toBe('mock')
    expect(config.AUTH_COOKIE_SECURE).toBe(false)
  })

  it.each([
    ['CONTENT_SOURCE', 'mongo'],
    ['PORT', 'abc'],
    ['LOG_LEVEL', 'bavard'],
    ['SEED_ON_EMPTY', 'peut-être'],
    ['PISTON_URL', 'pas une url'],
    ['JWT_SECRET', 'trop-court'],
  ])('refuse %s=%s en nommant la variable', (name, value) => {
    expect(() => parseConfig({ ...SECRET, [name]: value })).toThrow(
      new RegExp(`Configuration invalide[\\s\\S]*${name}`),
    )
  })

  it('exige un secret de signature des jetons', () => {
    expect(() => parseConfig({})).toThrow(/Configuration invalide[\s\S]*JWT_SECRET/)
  })
})
