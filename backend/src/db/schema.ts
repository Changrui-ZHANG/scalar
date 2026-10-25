import type { Episode, Exercise as ExerciseRow, Lesson as LessonRow } from '@prisma/client'

export type {
  Chapter,
  ChapterLevel,
  Episode,
  EpisodeType,
  ExerciseTestCase,
  ProgrammingLanguage,
  PublicationStatus,
  SolutionCheckStatus,
  Track,
} from '@prisma/client'

/**
 * Lecons et exercices tels que les services les manipulent : l'episode et sa
 * specialisation reunis, comme avant l'heritage. `id` est celui de l'episode,
 * `position` son rang dans le chapitre, lecons et exercices confondus.
 */
type EpisodeFields = Pick<
  Episode,
  | 'id'
  | 'chapterId'
  | 'slug'
  | 'position'
  | 'title'
  | 'status'
  | 'firstPublishedAt'
  | 'createdAt'
  | 'updatedAt'
>

export type Lesson = EpisodeFields & Pick<LessonRow, 'summary' | 'body' | 'lastReviewedAt'>

export type Exercise = EpisodeFields &
  Pick<
    ExerciseRow,
    | 'instructions'
    | 'functionName'
    | 'starterCode'
    | 'solutionCode'
    | 'solutionCheckStatus'
    | 'solutionCheckedAt'
  > & {
    /** Textes de `exercise_hints`, par position. */
    hints: string[]
  }
