import { z } from 'zod'

import { MESSAGES, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../constants.ts'
import type { User } from '../entity/user.entity.ts'
import type { UserRepository } from '../repository/user.repository.ts'
import type { PasswordHasher } from './password-hasher.service.ts'
import type { SessionTokenService } from './session-token.service.ts'

export interface Credentials {
  readonly email: string
  readonly password: string
}

export interface PublicUser {
  readonly id: string
  readonly email: string
  readonly createdAt: Date
}

export interface Session {
  readonly user: PublicUser
  readonly token: string
}

export interface Authentication {
  readonly user: PublicUser
  /** Nouveau jeton quand l'ancien a passe la moitie de sa vie, sinon null. */
  readonly renewedToken: string | null
}

const credentialsSchema = z.object({
  email: z
    .string(MESSAGES.invalidEmail)
    .trim()
    .toLowerCase()
    .pipe(z.email(MESSAGES.invalidEmail).max(254)),
  password: z
    .string(MESSAGES.invalidPassword)
    .min(PASSWORD_MIN_LENGTH, MESSAGES.invalidPassword)
    .max(PASSWORD_MAX_LENGTH, MESSAGES.invalidPassword),
})

export function parseCredentials(
  body: unknown,
): { ok: true; credentials: Credentials } | { ok: false; error: string } {
  const parsed = credentialsSchema.safeParse(body ?? {})
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? MESSAGES.invalidRequest }
  }
  return { ok: true, credentials: parsed.data }
}

const normalizeEmail = (email: string): string => email.trim().toLowerCase()

const toPublicUser = ({ id, email, createdAt }: User): PublicUser => ({ id, email, createdAt })

export class AuthService {
  private readonly users: UserRepository
  private readonly hasher: PasswordHasher
  private readonly tokens: SessionTokenService
  private decoyHash: Promise<string> | null = null

  constructor(users: UserRepository, hasher: PasswordHasher, tokens: SessionTokenService) {
    this.users = users
    this.hasher = hasher
    this.tokens = tokens
  }

  /** Null si l'email est deja pris. */
  async register({ email, password }: Credentials): Promise<Session | null> {
    const user = await this.users.create({
      email: normalizeEmail(email),
      passwordHash: await this.hasher.hash(password),
    })
    return user && this.openSession(user)
  }

  /** Null si l'email ou le mot de passe est faux, sans dire lequel. */
  async login({ email, password }: Credentials): Promise<Session | null> {
    const user = await this.users.findByEmail(normalizeEmail(email))
    if (!user) {
      // Meme cout qu'un vrai essai : sinon le temps de reponse revele quels emails ont un compte.
      this.decoyHash ??= this.hasher.hash('mot de passe leurre')
      await this.hasher.verify(await this.decoyHash, password)
      return null
    }
    return (await this.hasher.verify(user.passwordHash, password)) ? this.openSession(user) : null
  }

  /** Null si le jeton est invalide, expire, ou revoque depuis son emission. */
  async authenticate(token: string): Promise<Authentication | null> {
    const claims = await this.tokens.verify(token)
    if (!claims) {
      return null
    }
    const user = await this.users.findById(claims.userId)
    if (!user || user.tokenVersion !== claims.tokenVersion) {
      return null
    }
    const renewedToken = this.tokens.isAging(claims)
      ? await this.tokens.sign(user.id, user.tokenVersion)
      : null
    return { user: toPublicUser(user), renewedToken }
  }

  /** Revoque tous les jetons de l'utilisateur, sur tous ses appareils. */
  async logout(userId: string): Promise<void> {
    await this.users.incrementTokenVersion(userId)
  }

  private async openSession(user: User): Promise<Session> {
    return { user: toPublicUser(user), token: await this.tokens.sign(user.id, user.tokenVersion) }
  }
}
