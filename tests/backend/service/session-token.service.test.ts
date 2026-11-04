import { SignJWT, UnsecuredJWT } from 'jose'
import { describe, expect, it } from 'vitest'

import { SessionTokenService } from '../../../backend/src/service/session-token.service.ts'

const SECRET = 'secret-de-test-assez-long-pour-hs256-0123456789'
const USER = '6f1c2a3b-0000-4000-8000-000000000001'
const T0 = new Date('2026-11-05T10:00:00Z')
const at = (seconds: number) => () => new Date(T0.getTime() + seconds * 1000)

describe('SessionTokenService', () => {
  it('retrouve l’utilisateur et la version de jeton qu’il a signés', async () => {
    const tokens = new SessionTokenService(SECRET, 900, at(0))

    expect(await tokens.verify(await tokens.sign(USER, 3))).toEqual({
      userId: USER,
      tokenVersion: 3,
      issuedAt: T0.getTime() / 1000,
    })
  })

  it('refuse un jeton expiré, et l’accepte juste avant', async () => {
    const token = await new SessionTokenService(SECRET, 900, at(0)).sign(USER, 0)

    expect(await new SessionTokenService(SECRET, 900, at(899)).verify(token)).not.toBeNull()
    expect(await new SessionTokenService(SECRET, 900, at(900)).verify(token)).toBeNull()
  })

  it('refuse un jeton signé avec un autre secret', async () => {
    const forged = await new SessionTokenService('un-autre-secret-tout-aussi-long-0123456789').sign(
      USER,
      0,
    )

    expect(await new SessionTokenService(SECRET).verify(forged)).toBeNull()
  })

  it('refuse un jeton dont la charge a été modifiée', async () => {
    const tokens = new SessionTokenService(SECRET)
    const [header, , signature] = (await tokens.sign(USER, 0)).split('.')
    const payload = Buffer.from(JSON.stringify({ sub: USER, ver: 99 })).toString('base64url')

    expect(await tokens.verify(`${header}.${payload}.${signature}`)).toBeNull()
  })

  it('refuse un jeton non signé (alg none)', async () => {
    const unsigned = new UnsecuredJWT({ ver: 0 })
      .setSubject(USER)
      .setIssuedAt()
      .setExpirationTime('15m')
      .encode()

    expect(await new SessionTokenService(SECRET).verify(unsigned)).toBeNull()
  })

  it('refuse un jeton bien signé dont le sujet n’est pas un id d’apprenant', async () => {
    const token = await new SessionTokenService(SECRET).sign('pas-un-uuid', 0)

    expect(await new SessionTokenService(SECRET).verify(token)).toBeNull()
  })

  it('refuse un jeton bien signé mais sans version', async () => {
    const key = new TextEncoder().encode(SECRET)
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(USER)
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(key)

    expect(await new SessionTokenService(SECRET).verify(token)).toBeNull()
  })

  it.each(['', 'pas-un-jeton', 'a.b.c'])('refuse une valeur illisible : %j', async (value) => {
    expect(await new SessionTokenService(SECRET).verify(value)).toBeNull()
  })

  it('signale un jeton à renouveler à partir de la moitié de sa vie', async () => {
    const claims = (await new SessionTokenService(SECRET, 900, at(0)).verify(
      await new SessionTokenService(SECRET, 900, at(0)).sign(USER, 0),
    ))!

    expect(new SessionTokenService(SECRET, 900, at(449)).isAging(claims)).toBe(false)
    expect(new SessionTokenService(SECRET, 900, at(450)).isAging(claims)).toBe(true)
  })
})
