export interface User {
  id: string
  email: string
  passwordHash: string
  tokenVersion: number
  createdAt: Date
}
