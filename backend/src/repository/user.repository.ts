import { randomUUID } from 'node:crypto'

import type { User } from '../entity/user.entity.ts'

export interface NewUser {
  readonly email: string
  readonly passwordHash: string
}

export type ClaimOutcome =
  | { readonly status: 'claimed'; readonly user: User }
  | { readonly status: 'email-taken' }
  /** Inconnu, ou deja inscrit : seul un apprenant anonyme peut etre repris. */
  | { readonly status: 'not-anonymous' }

export interface UserRepository {
  /** Null si l'email est deja pris, quelle que soit sa casse. */
  create(user: NewUser): Promise<User | null>
  /** Donne un email et un mot de passe a un apprenant anonyme : meme ligne, donc progression conservee. */
  claimAnonymous(id: string, user: NewUser): Promise<ClaimOutcome>
  /** Sans email ni mot de passe : sa progression est enregistree avant tout compte. */
  createAnonymous(): Promise<User>
  findById(id: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  /** Revoque tous les jetons emis : renvoie la nouvelle version, null si l'utilisateur n'existe pas. */
  incrementTokenVersion(id: string): Promise<number | null>
  /** Null si aucun compte n'a cet email : un anonyme ne peut pas devenir admin. */
  promoteToAdmin(email: string): Promise<User | null>
}

export class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, User>()

  async create(user: NewUser): Promise<User | null> {
    const email = user.email.toLowerCase()
    if ((await this.findByEmail(email)) !== null) {
      return null
    }
    const created: User = {
      id: randomUUID(),
      email,
      passwordHash: user.passwordHash,
      tokenVersion: 0,
      role: 'learner',
      createdAt: new Date(),
    }
    this.users.set(created.id, created)
    return { ...created }
  }

  async claimAnonymous(id: string, user: NewUser): Promise<ClaimOutcome> {
    const learner = this.users.get(id)
    if (!learner || learner.email !== null) {
      return { status: 'not-anonymous' }
    }
    const email = user.email.toLowerCase()
    if ((await this.findByEmail(email)) !== null) {
      return { status: 'email-taken' }
    }
    learner.email = email
    learner.passwordHash = user.passwordHash
    return { status: 'claimed', user: { ...learner } }
  }

  async createAnonymous(): Promise<User> {
    const created: User = {
      id: randomUUID(),
      email: null,
      passwordHash: null,
      tokenVersion: 0,
      role: 'learner',
      createdAt: new Date(),
    }
    this.users.set(created.id, created)
    return { ...created }
  }

  async findById(id: string): Promise<User | null> {
    const user = this.users.get(id)
    return user ? { ...user } : null
  }

  async findByEmail(email: string): Promise<User | null> {
    const wanted = email.toLowerCase()
    const user = [...this.users.values()].find((u) => u.email === wanted)
    return user ? { ...user } : null
  }

  async incrementTokenVersion(id: string): Promise<number | null> {
    const user = this.users.get(id)
    if (!user) {
      return null
    }
    user.tokenVersion += 1
    return user.tokenVersion
  }

  async promoteToAdmin(email: string): Promise<User | null> {
    const wanted = email.toLowerCase()
    const user = [...this.users.values()].find((u) => u.email === wanted)
    if (!user) {
      return null
    }
    user.role = 'admin'
    return { ...user }
  }
}
