import { beforeEach, describe, expect, it } from 'vitest'

import { fakeHasher } from '../auth.fixtures.ts'
import { InMemoryUserRepository } from '../../../backend/src/repository/user.repository.ts'
import { ensureConfiguredAdmin } from '../../../backend/src/service/configured-admin.service.ts'

const LOCAL = { email: 'test@test.fr', password: 'test', nodeEnv: 'development' }

describe('ensureConfiguredAdmin', () => {
  let users: InMemoryUserRepository
  beforeEach(() => {
    users = new InMemoryUserRepository()
  })

  it('crée le compte admin de l’environnement, mot de passe haché', async () => {
    await ensureConfiguredAdmin(users, fakeHasher, LOCAL)

    expect(await users.findByEmail('test@test.fr')).toMatchObject({
      role: 'admin',
      passwordHash: 'hash:test',
    })
  })

  it('applique un mot de passe changé dans l’environnement au redémarrage', async () => {
    await ensureConfiguredAdmin(users, fakeHasher, LOCAL)

    await ensureConfiguredAdmin(users, fakeHasher, { ...LOCAL, password: 'autre' })

    expect((await users.findByEmail('test@test.fr'))?.passwordHash).toBe('hash:autre')
  })

  it.each([
    ['sans email', { ...LOCAL, email: undefined }],
    ['sans mot de passe', { ...LOCAL, password: undefined }],
    ['en production', { ...LOCAL, nodeEnv: 'production' }],
  ])('ne crée aucun compte %s', async (_cas, settings) => {
    await ensureConfiguredAdmin(users, fakeHasher, settings)

    expect(await users.findByEmail('test@test.fr')).toBeNull()
  })
})
