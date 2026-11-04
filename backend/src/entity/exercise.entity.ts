import type { PublicationStatus, SolutionCheckStatus } from '@scalar/shared/enums'

export interface Exercise {
  id: number
  chapterId: number
  slug: string
  position: number
  title: string
  instructions: string
  functionName: string
  starterCode: string
  // Jamais renvoyee au navigateur avant une premiere soumission.
  solutionCode: string
  hints: string[]
  solutionCheckStatus: SolutionCheckStatus
  solutionCheckedAt: Date | null
  status: PublicationStatus
  firstPublishedAt: Date | null
  createdAt: Date
  updatedAt: Date
}
