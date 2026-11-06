import type { PrismaClient } from '@prisma/client'

import type { Placement } from '../entity/placement.entity.ts'
import type { NewPlacement, PlacementRepository } from './placement.repository.ts'
import { toPlacement } from './prisma.mapper.ts'

export class PrismaPlacementRepository implements PlacementRepository {
  private readonly prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  async save(placement: NewPlacement): Promise<Placement> {
    return toPlacement(await this.prisma.placement.create({ data: placement }))
  }

  async findById(id: number): Promise<Placement | null> {
    const row = await this.prisma.placement.findUnique({ where: { id } })
    return row && toPlacement(row)
  }

  async assignToUser(id: number, userId: string): Promise<Placement | null> {
    // Un seul UPDATE conditionnel : deux comptes ne peuvent pas reprendre le meme resultat.
    const { count } = await this.prisma.placement.updateMany({
      where: { id, OR: [{ userId: null }, { userId }] },
      data: { userId },
    })
    return count === 0 ? null : this.findById(id)
  }

  async findLatestByUser(userId: string): Promise<Placement | null> {
    // L'id departage deux resultats enregistres dans la meme milliseconde.
    const row = await this.prisma.placement.findFirst({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    })
    return row && toPlacement(row)
  }
}
