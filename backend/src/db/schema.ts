export type { Chapter, Exercise, Language } from '@prisma/client'

export interface TestCase {
  readonly args: readonly unknown[]
  readonly expected: unknown
}
