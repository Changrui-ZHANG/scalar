import { errors, jwtVerify, SignJWT } from 'jose'

import { SESSION_TTL_SECONDS } from '../constants.ts'

export interface SessionClaims {
  readonly userId: string
  readonly tokenVersion: number
  /** En secondes depuis l'epoque, comme dans le jeton. */
  readonly issuedAt: number
}

const ALGORITHM = 'HS256'

// Forme d'un UUID (8-4-4-4-12 chiffres hexadecimaux) : le sujet du jeton est un id d'apprenant.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export class SessionTokenService {
  private readonly key: Uint8Array
  private readonly ttlSeconds: number
  private readonly now: () => Date

  constructor(
    secret: string,
    ttlSeconds = SESSION_TTL_SECONDS,
    now: () => Date = () => new Date(),
  ) {
    this.key = new TextEncoder().encode(secret)
    this.ttlSeconds = ttlSeconds
    this.now = now
  }

  get lifetimeSeconds(): number {
    return this.ttlSeconds
  }

  /** Vrai a partir de la moitie de la duree de vie : le jeton est alors renouvele. */
  isAging(claims: SessionClaims): boolean {
    return this.nowSeconds() - claims.issuedAt >= this.ttlSeconds / 2
  }

  async sign(userId: string, tokenVersion: number): Promise<string> {
    const issuedAt = this.nowSeconds()
    // sub = id de l'apprenant, ver = sa version de jeton (comparee a la base pour la revocation).
    return new SignJWT({ ver: tokenVersion })
      .setProtectedHeader({ alg: ALGORITHM })
      .setSubject(userId)
      .setIssuedAt(issuedAt)
      .setExpirationTime(issuedAt + this.ttlSeconds)
      .sign(this.key)
  }

  /** Null pour un jeton expire, falsifie ou mal forme. */
  async verify(token: string): Promise<SessionClaims | null> {
    try {
      // Sans liste d'algorithmes, un jeton signe autrement (ex. `none`) pourrait etre accepte.
      const { payload } = await jwtVerify(token, this.key, {
        algorithms: [ALGORITHM],
        currentDate: this.now(),
      })
      const { sub, ver, iat } = payload
      if (
        typeof sub !== 'string' ||
        !UUID.test(sub) ||
        !Number.isInteger(ver) ||
        typeof iat !== 'number'
      ) {
        return null
      }
      return { userId: sub, tokenVersion: ver as number, issuedAt: iat }
    } catch (error: unknown) {
      if (error instanceof errors.JOSEError) {
        return null
      }
      throw error
    }
  }

  private nowSeconds(): number {
    return Math.floor(this.now().getTime() / 1000)
  }
}
