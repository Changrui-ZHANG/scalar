import { Prisma } from '@prisma/client'
import type { PrismaClient } from '@prisma/client'

import type { User } from '../entity/user.entity.ts'
import { toUser } from './prisma.mapper.ts'
import type { ClaimOutcome, NewUser, UserRepository } from './user.repository.ts'

// Prisma leve sur un id mal forme pour une colonne UUID, la ou le depot en memoire repond null.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const isKnownError = (error: unknown, code: string): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === code

export class PrismaUserRepository implements UserRepository {
  private readonly prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  async create(user: NewUser): Promise<User | null> {
    try {
      const row = await this.prisma.user.create({
        data: { email: user.email.toLowerCase(), passwordHash: user.passwordHash },
      })
      return toUser(row)
    } catch (error: unknown) {
      if (isKnownError(error, 'P2002')) {
        return null
      }
      throw error
    }
  }

  async claimAnonymous(id: string, user: NewUser): Promise<ClaimOutcome> {
    if (!UUID.test(id)) {
      return { status: 'not-anonymous' }
    }
    try {
      // email: null dans le filtre : deux inscriptions simultanees ne reprennent pas deux fois le meme apprenant.
      // AND, car Prisma n'accepte que des valeurs non nulles pour un champ unique (email) a la racine du where.
      const row = await this.prisma.user.update({
        where: { id, AND: { email: null } },
        data: { email: user.email.toLowerCase(), passwordHash: user.passwordHash },
      })
      return { status: 'claimed', user: toUser(row) }
    } catch (error: unknown) {
      // P2002 : contrainte d'unicite violee (email deja pris).
      if (isKnownError(error, 'P2002')) {
        return { status: 'email-taken' }
      }
      // P2025 : aucune ligne ne correspond au filtre (inconnu ou deja inscrit).
      if (isKnownError(error, 'P2025')) {
        return { status: 'not-anonymous' }
      }
      throw error
    }
  }

  async createAnonymous(): Promise<User> {
    return toUser(await this.prisma.user.create({ data: {} }))
  }

  async findById(id: string): Promise<User | null> {
    if (!UUID.test(id)) {
      return null
    }
    const row = await this.prisma.user.findUnique({ where: { id } })
    return row && toUser(row)
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    return row && toUser(row)
  }

  async incrementTokenVersion(id: string): Promise<number | null> {
    if (!UUID.test(id)) {
      return null
    }
    try {
      const row = await this.prisma.user.update({
        where: { id },
        data: { tokenVersion: { increment: 1 } },
      })
      return row.tokenVersion
    } catch (error: unknown) {
      if (isKnownError(error, 'P2025')) {
        return null
      }
      throw error
    }
  }

  async promoteToAdmin(email: string): Promise<User | null> {
    const rows = await this.prisma.user.updateManyAndReturn({
      where: { email: email.toLowerCase() },
      data: { role: 'admin' },
    })
    return rows[0] ? toUser(rows[0]) : null
  }
}
