import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fakeHasher, TEST_JWT_SECRET } from '../auth.fixtures.ts'
import { MESSAGES } from '../../../backend/src/constants.ts'
import { InMemoryUserRepository } from '../../../backend/src/repository/user.repository.ts'
import type { RegisterOutcome, Session } from '../../../backend/src/service/auth.service.ts'
import { AuthService, parseCredentials } from '../../../backend/src/service/auth.service.ts'
import type { PasswordHasher } from '../../../backend/src/service/password-hasher.service.ts'
import { SessionTokenService } from '../../../backend/src/service/session-token.service.ts'

const ADA = { email: 'ada@example.org', password: 'correct horse' }

const sessionOf = (outcome: RegisterOutcome): Session => {
  if (outcome.status !== 'registered') {
    throw new Error(`inscription refusée : ${outcome.status}`)
  }
  return outcome.session
}

describe('parseCredentials', () => {
  it('normalise l’email : espaces retirés, minuscules', () => {
    expect(parseCredentials({ email: '  Ada@Example.ORG ', password: 'correct horse' })).toEqual({
      ok: true,
      credentials: ADA,
    })
  })

  it.each([
    ['sans corps', undefined, MESSAGES.invalidEmail],
    ['email absent', { password: 'correct horse' }, MESSAGES.invalidEmail],
    ['email invalide', { email: 'ada', password: 'correct horse' }, MESSAGES.invalidEmail],
    ['email non texte', { email: 42, password: 'correct horse' }, MESSAGES.invalidEmail],
    ['mot de passe absent', { email: ADA.email }, MESSAGES.invalidPassword],
    ['mot de passe court', { email: ADA.email, password: '1234567' }, MESSAGES.invalidPassword],
    [
      'mot de passe trop long',
      { email: ADA.email, password: 'x'.repeat(129) },
      MESSAGES.invalidPassword,
    ],
  ])('refuse : %s', (_cas, body, error) => {
    expect(parseCredentials(body)).toEqual({ ok: false, error })
  })

  it('accepte un mot de passe de 8 à 128 caractères', () => {
    expect(parseCredentials({ email: ADA.email, password: 'x'.repeat(8) }).ok).toBe(true)
    expect(parseCredentials({ email: ADA.email, password: 'x'.repeat(128) }).ok).toBe(true)
  })
})

describe('AuthService', () => {
  let users: InMemoryUserRepository
  let hasher: PasswordHasher
  let clock: Date
  let auth: AuthService
  beforeEach(() => {
    users = new InMemoryUserRepository()
    hasher = { hash: vi.fn(fakeHasher.hash), verify: vi.fn(fakeHasher.verify) }
    clock = new Date('2026-11-07T10:00:00Z')
    auth = new AuthService(
      users,
      hasher,
      new SessionTokenService(TEST_JWT_SECRET, 900, () => clock),
    )
  })
  const later = (seconds: number) => {
    clock = new Date(clock.getTime() + seconds * 1000)
  }

  it('inscrit un apprenant, stocke le hash et ouvre une session', async () => {
    const session = sessionOf(await auth.register(ADA))

    expect(session.user).toEqual({
      id: expect.any(String),
      email: ADA.email,
      role: 'learner',
      createdAt: expect.any(Date),
    })
    expect((await users.findByEmail(ADA.email))?.passwordHash).toBe('hash:correct horse')
    expect((await auth.authenticate(session.token))?.user).toEqual(session.user)
  })

  it('normalise l’email même sans passer par parseCredentials', async () => {
    const session = sessionOf(await auth.register({ ...ADA, email: '  Ada@Example.ORG ' }))

    expect(session.user.email).toBe(ADA.email)
    expect((await auth.register(ADA)).status).toBe('email-taken')
    expect((await auth.login({ ...ADA, email: ' ADA@example.org ' }))?.user).toEqual(session.user)
  })

  it('ne renvoie jamais le hash du mot de passe', async () => {
    expect(JSON.stringify(await auth.register(ADA))).not.toContain('hash:')
  })

  it('refuse une inscription avec un email déjà pris', async () => {
    await auth.register(ADA)

    expect(await auth.register({ ...ADA, password: 'autre mot de passe' })).toEqual({
      status: 'email-taken',
    })
  })

  describe('inscription depuis un apprenant anonyme', () => {
    it('garde son identifiant : sa progression devient celle du compte', async () => {
      const { id } = await users.createAnonymous()

      const session = sessionOf(await auth.register(ADA, id))

      expect(session.user.id).toBe(id)
      expect(await users.findById(id)).toMatchObject({
        email: ADA.email,
        passwordHash: 'hash:correct horse',
      })
    })

    it('refuse un identifiant inconnu, sans hacher le mot de passe', async () => {
      expect(await auth.register(ADA, '00000000-0000-4000-8000-000000000000')).toEqual({
        status: 'learner-not-found',
      })
      expect(hasher.hash).not.toHaveBeenCalled()
    })

    it('refuse un apprenant qui a déjà un compte', async () => {
      const { user } = sessionOf(await auth.register(ADA))

      expect(await auth.register({ ...ADA, email: 'autre@example.org' }, user.id)).toEqual({
        status: 'learner-already-registered',
      })
    })

    it('refuse un email déjà pris, et laisse l’apprenant anonyme', async () => {
      await auth.register(ADA)
      const { id } = await users.createAnonymous()

      expect(await auth.register(ADA, id)).toEqual({ status: 'email-taken' })
      expect((await users.findById(id))?.email).toBeNull()
    })
  })

  it('connecte avec le bon mot de passe', async () => {
    const { user } = sessionOf(await auth.register(ADA))

    expect((await auth.login(ADA))?.user).toEqual(user)
  })

  it('refuse un mauvais mot de passe ou un email inconnu de la même façon', async () => {
    await auth.register(ADA)

    expect(await auth.login({ ...ADA, password: 'mauvais mot de passe' })).toBeNull()
    expect(await auth.login({ ...ADA, email: 'personne@example.org' })).toBeNull()
  })

  it('vérifie quand même un hash pour un email inconnu, pour ne pas répondre plus vite', async () => {
    await auth.login({ ...ADA, email: 'personne@example.org' })
    await auth.login({ ...ADA, email: 'personne@example.org' })

    expect(hasher.verify).toHaveBeenCalledTimes(2)
    expect(hasher.hash).toHaveBeenCalledTimes(1)
  })

  it('refuse un jeton illisible', async () => {
    expect(await auth.authenticate('pas-un-jeton')).toBeNull()
  })

  it('refuse le jeton d’un compte qui n’existe plus', async () => {
    const other = new AuthService(
      new InMemoryUserRepository(),
      hasher,
      new SessionTokenService(TEST_JWT_SECRET, 900, () => clock),
    )
    const { token } = sessionOf(await other.register(ADA))

    expect(await auth.authenticate(token)).toBeNull()
  })

  it('refuse un jeton signé pour un apprenant resté anonyme', async () => {
    const { id } = await users.createAnonymous()
    const token = await new SessionTokenService(TEST_JWT_SECRET, 900, () => clock).sign(id, 0)

    expect(await auth.authenticate(token)).toBeNull()
  })

  it('la déconnexion révoque tous les jetons déjà émis', async () => {
    const first = sessionOf(await auth.register(ADA))
    const second = (await auth.login(ADA))!

    await auth.logout(first.user.id)

    expect(await auth.authenticate(first.token)).toBeNull()
    expect(await auth.authenticate(second.token)).toBeNull()
    expect(await auth.authenticate((await auth.login(ADA))!.token)).not.toBeNull()
  })

  it('renouvelle le jeton passé la moitié de sa vie, pas avant', async () => {
    const { token } = sessionOf(await auth.register(ADA))

    later(449)
    expect((await auth.authenticate(token))?.renewedToken).toBeNull()

    later(1)
    const renewed = (await auth.authenticate(token))?.renewedToken
    expect(renewed).toEqual(expect.any(String))

    later(600)
    expect(await auth.authenticate(token)).toBeNull()
    expect(await auth.authenticate(renewed!)).not.toBeNull()
  })
})
