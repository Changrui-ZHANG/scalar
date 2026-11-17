import type { ChapterLevel, ProgrammingLanguage } from '@scalar/shared/enums'

import type { ExerciseInput } from '../repository/admin-content.repository.ts'

export interface ExerciseBrief {
  readonly topic: string
  readonly level: ChapterLevel
  readonly language: ProgrammingLanguage
  readonly chapterTitle: string
  readonly chapterSummary: string
  readonly takenSlugs: readonly string[]
}

/** Non fiable : le service la revalide avec les memes regles qu'une saisie de l'admin. */
export type GeneratedExercise = ExerciseInput

export interface ExerciseGenerator {
  /** Null si le modele refuse ou rend une sortie inexploitable ; AiUnavailableError si l'API est en panne. */
  generate(brief: ExerciseBrief): Promise<GeneratedExercise | null>
}
