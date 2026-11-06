import type { ChapterLevel } from '@scalar/shared/enums'

export type PlacementLevel = Exclude<ChapterLevel, 'ecosystem'>

export interface Placement {
  id: number
  score: number
  level: PlacementLevel
  trackId: number
  declared: number
  knowledge: number
  practical: number
  userId: string | null
  createdAt: Date
}
