import type { ProgrammingLanguage, PublicationStatus } from '@scalar/shared/enums'

export interface Track {
  id: number
  slug: string
  name: string
  summary: string
  position: number
  programmingLanguage: ProgrammingLanguage | null
  prerequisiteTrackId: number | null
  status: PublicationStatus
  firstPublishedAt: Date | null
  createdAt: Date
  updatedAt: Date
}
