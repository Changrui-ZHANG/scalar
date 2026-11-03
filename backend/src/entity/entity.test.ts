import { $Enums } from '@prisma/client'
import {
  CHAPTER_LEVELS,
  PROGRAMMING_LANGUAGES,
  PUBLICATION_STATUSES,
  SOLUTION_CHECK_STATUSES,
} from '@scalar/shared/enums'
import { describe, expect, it } from 'vitest'

// L'ordre compte : la base trie les chapitres dans l'ordre de declaration de ChapterLevel.
describe('enums des entités = enums Prisma, ordre compris', () => {
  it.each([
    ['PublicationStatus', PUBLICATION_STATUSES, $Enums.PublicationStatus],
    ['ChapterLevel', CHAPTER_LEVELS, $Enums.ChapterLevel],
    ['ProgrammingLanguage', PROGRAMMING_LANGUAGES, $Enums.ProgrammingLanguage],
    ['SolutionCheckStatus', SOLUTION_CHECK_STATUSES, $Enums.SolutionCheckStatus],
  ])('%s', (_, shared, prisma) => {
    expect([...shared]).toEqual(Object.values(prisma))
  })
})
