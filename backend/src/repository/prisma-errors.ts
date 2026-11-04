import { Prisma } from '@prisma/client'

export const isKnownError = (error: unknown, code: string): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === code

export const FOREIGN_KEY_VIOLATION = 'P2003'
export const UNIQUE_VIOLATION = 'P2002'
export const RECORD_NOT_FOUND = 'P2025'
