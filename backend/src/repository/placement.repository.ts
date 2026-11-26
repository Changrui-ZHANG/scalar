import type { Placement } from '../entity/placement.entity.ts'

export type NewPlacement = Omit<Placement, 'id' | 'userId'>

export interface PlacementRepository {
  /** Toujours anonyme : un compte le reprend ensuite avec `assignToUser`. */
  save(placement: NewPlacement): Promise<Placement>
  findById(id: number): Promise<Placement | null>
  /** Null si le resultat est inconnu ou deja rattache a un autre compte. */
  assignToUser(id: number, userId: string): Promise<Placement | null>
  /** Le plus recent : un apprenant peut repasser le questionnaire. */
  findLatestByUser(userId: string): Promise<Placement | null>
  /** Rattache a `intoUserId` tous les resultats de `fromUserId` (fusion a la connexion). */
  reassignUser(fromUserId: string, intoUserId: string): Promise<void>
}

export class InMemoryPlacementRepository implements PlacementRepository {
  private readonly placements: Placement[] = []

  async save(placement: NewPlacement): Promise<Placement> {
    const saved: Placement = { id: this.placements.length + 1, ...placement, userId: null }
    this.placements.push(saved)
    return { ...saved }
  }

  async findById(id: number): Promise<Placement | null> {
    const found = this.placements.find((p) => p.id === id)
    return found ? { ...found } : null
  }

  async assignToUser(id: number, userId: string): Promise<Placement | null> {
    const found = this.placements.find((p) => p.id === id)
    if (!found || (found.userId !== null && found.userId !== userId)) {
      return null
    }
    found.userId = userId
    return { ...found }
  }

  async findLatestByUser(userId: string): Promise<Placement | null> {
    const latest = this.placements.findLast((p) => p.userId === userId)
    return latest ? { ...latest } : null
  }

  async reassignUser(fromUserId: string, intoUserId: string): Promise<void> {
    for (const placement of this.placements) {
      if (placement.userId === fromUserId) {
        placement.userId = intoUserId
      }
    }
  }
}
