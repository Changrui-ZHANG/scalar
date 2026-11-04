import type { ChapterLevel, PublicationStatus } from '@scalar/shared/enums'

export interface Chapter {
  id: number
  trackId: number
  slug: string
  level: ChapterLevel
  position: number
  title: string
  summary: string
  status: PublicationStatus
  firstPublishedAt: Date | null
  createdAt: Date
  updatedAt: Date
}
