import { Prisma } from '@prisma/client'
import type { PrismaClient } from '@prisma/client'

import type { User } from '../entity/user.entity.ts'
import { toUser } from './prisma.mapper.ts'
import type { NewUser, UserRepository } from './user.repository.ts'

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
}
