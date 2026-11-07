import { describe, expect, it } from 'vitest'

import { Argon2PasswordHasher } from '../../../backend/src/service/password-hasher.service.ts'

describe('Argon2PasswordHasher', () => {
  const hasher = new Argon2PasswordHasher()

  it('produit un hash argon2id aux paramètres OWASP, jamais le mot de passe', async () => {
    const hash = await hasher.hash('correct horse')

    const [, algorithm, , params] = hash.split('$')
    expect(algorithm).toBe('argon2id')
    expect(params?.split(',').toSorted()).toEqual(['m=19456', 'p=1', 't=2'])
    expect(hash).not.toContain('correct horse')
  })

  it('sale chaque hash : deux hash du même mot de passe diffèrent', async () => {
    expect(await hasher.hash('correct horse')).not.toBe(await hasher.hash('correct horse'))
  })

  it('vérifie le bon mot de passe et refuse les autres', async () => {
    const hash = await hasher.hash('correct horse')

    expect(await hasher.verify(hash, 'correct horse')).toBe(true)
    expect(await hasher.verify(hash, 'Correct horse')).toBe(false)
  })
})
