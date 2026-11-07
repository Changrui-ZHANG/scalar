import type { UserRole } from '@scalar/shared/enums'

export interface User {
  id: string
  // Nuls ensemble : apprenant anonyme.
  email: string | null
  passwordHash: string | null
  tokenVersion: number
  role: UserRole
  createdAt: Date
}
