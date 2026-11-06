export interface User {
  id: string
  // Nuls ensemble : apprenant anonyme.
  email: string | null
  passwordHash: string | null
  tokenVersion: number
  createdAt: Date
}
