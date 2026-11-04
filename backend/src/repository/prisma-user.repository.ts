import type { PrismaClient } from '@prisma/client'

import type { User } from '../entity/user.entity.ts'
import { isKnownError, RECORD_NOT_FOUND, UNIQUE_VIOLATION } from './prisma-errors.ts'
import { toUser } from './prisma.mapper.ts'
import type { NewUser, UserRepository } from './user.repository.ts'
import { isUuid } from './uuid.ts'

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
      if (isKnownError(error, UNIQUE_VIOLATION)) {
        return null
      }
      throw error
    }
  }

  async findById(id: string): Promise<User | null> {
    if (!isUuid(id)) {
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
    if (!isUuid(id)) {
      return null
    }
    try {
      const row = await this.prisma.user.update({
        where: { id },
        data: { tokenVersion: { increment: 1 } },
      })
      return row.tokenVersion
    } catch (error: unknown) {
      if (isKnownError(error, RECORD_NOT_FOUND)) {
        return null
      }
      throw error
    }
  }
}
