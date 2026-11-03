import type { PublicationStatus } from '@scalar/shared/enums'

export interface Lesson {
  id: number
  chapterId: number
  slug: string
  position: number
  title: string
  summary: string
  body: string
  lastReviewedAt: Date | null
  status: PublicationStatus
  firstPublishedAt: Date | null
  createdAt: Date
  updatedAt: Date
}
