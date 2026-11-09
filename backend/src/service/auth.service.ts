import type { UserRole } from '@scalar/shared/enums'
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
  readonly role: UserRole
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

export type RegisterOutcome =
  | { readonly status: 'registered'; readonly session: Session }
  | { readonly status: 'email-taken' }
  | { readonly status: 'learner-not-found' }
  | { readonly status: 'learner-already-registered' }

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

const loginSchema = z.object({
  email: z
    .string(MESSAGES.invalidEmail)
    .trim()
    .toLowerCase()
    .min(1, MESSAGES.invalidEmail)
    .max(254, MESSAGES.invalidEmail),
  password: z
    .string(MESSAGES.invalidPassword)
    .min(1, MESSAGES.invalidPassword)
    .max(PASSWORD_MAX_LENGTH, MESSAGES.invalidPassword),
})

type ParsedCredentials = { ok: true; credentials: Credentials } | { ok: false; error: string }

function parseWith(schema: z.ZodType<Credentials>, body: unknown): ParsedCredentials {
  const parsed = schema.safeParse(body ?? {})
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? MESSAGES.invalidRequest }
  }
  return { ok: true, credentials: parsed.data }
}

export const parseCredentials = (body: unknown): ParsedCredentials =>
  parseWith(credentialsSchema, body)

export const parseLoginCredentials = (body: unknown): ParsedCredentials =>
  parseWith(loginSchema, body)

const normalizeEmail = (email: string): string => email.trim().toLowerCase()

// Seul appel sur un compte inscrit : email n'y est jamais nul.
const toPublicUser = ({ id, email, role, createdAt }: User): PublicUser => ({
  id,
  email: email ?? '',
  role,
  createdAt,
})

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

  /** Avec `learnerId`, reprend cet apprenant anonyme : sa progression devient celle du compte. */
  async register({ email, password }: Credentials, learnerId?: string): Promise<RegisterOutcome> {
    const account = async () => ({
      email: normalizeEmail(email),
      passwordHash: await this.hasher.hash(password),
    })
    if (learnerId === undefined) {
      const user = await this.users.create(await account())
      return user
        ? { status: 'registered', session: await this.openSession(user) }
        : { status: 'email-taken' }
    }
    const learner = await this.users.findById(learnerId)
    if (!learner) {
      return { status: 'learner-not-found' }
    }
    if (learner.email !== null) {
      return { status: 'learner-already-registered' }
    }
    const claim = await this.users.claimAnonymous(learnerId, await account())
    switch (claim.status) {
      case 'claimed':
        return { status: 'registered', session: await this.openSession(claim.user) }
      case 'email-taken':
        return claim
      default:
        // Inscrit entre la lecture et la reprise, par une requete concurrente.
        return { status: 'learner-already-registered' }
    }
  }

  /** Null si l'email ou le mot de passe est faux, sans dire lequel. */
  async login({ email, password }: Credentials): Promise<Session | null> {
    const user = await this.users.findByEmail(normalizeEmail(email))
    // Pas de hash : email inconnu (un anonyme n'a jamais d'email, donc jamais trouve ici).
    if (!user?.passwordHash) {
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
    // Version differente : une deconnexion a eu lieu depuis l'emission du jeton.
    if (!user || user.email === null || user.tokenVersion !== claims.tokenVersion) {
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
