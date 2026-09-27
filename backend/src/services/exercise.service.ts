/**
 * Lecture du parcours : langages, chapitres, exercices.
 *
 * Tout ce qui sort d'ici est destine au navigateur : la solution d'un exercice
 * n'y figure jamais. Elle ne sera revelee qu'apres une soumission.
 */

import type { Chapter, Exercise, Language, TestCase } from '../db/schema.ts'
import type { ExerciseRepository } from '../repositories/exercise.repository.ts'

export const LANGUAGES = ['javascript'] as const satisfies readonly Language[]

export function isLanguage(value: string): value is Language {
  return (LANGUAGES as readonly string[]).includes(value)
}

export interface ExerciseSummary {
  readonly slug: string
  readonly title: string
  readonly position: number
}

export interface ChapterSummary {
  readonly slug: string
  readonly title: string
  readonly position: number
  readonly exercises: readonly ExerciseSummary[]
}

export interface ChapterDetail extends ChapterSummary {
  readonly language: Language
  readonly lesson: string
}

export interface ExerciseLink {
  readonly slug: string
  readonly chapterSlug: string
}

export interface PublicExercise {
  readonly slug: string
  readonly title: string
  readonly position: number
  readonly statement: string
  readonly functionName: string
  readonly starterCode: string
  readonly hints: readonly string[]
  readonly tests: readonly TestCase[]
  readonly chapter: { readonly slug: string; readonly title: string }
  /** Exercice suggere ensuite : suivant du chapitre, sinon premier du chapitre suivant. */
  readonly next: ExerciseLink | null
}

const toSummary = (e: Exercise): ExerciseSummary => ({
  slug: e.slug,
  title: e.title,
  position: e.position,
})

export class ExerciseService {
  private readonly repository: ExerciseRepository

  constructor(repository: ExerciseRepository) {
    this.repository = repository
  }

  async listChapters(language: Language): Promise<readonly ChapterSummary[]> {
    const chapters = await this.repository.listChapters(language)
    return Promise.all(chapters.map((c) => this.summarize(c)))
  }

  async getChapter(slug: string): Promise<ChapterDetail | null> {
    const chapter = await this.repository.findChapterBySlug(slug)
    if (!chapter) {
      return null
    }

    return {
      ...(await this.summarize(chapter)),
      language: chapter.language,
      lesson: chapter.lesson,
    }
  }

  async getExercise(slug: string): Promise<PublicExercise | null> {
    const exercise = await this.repository.findExerciseBySlug(slug)
    if (!exercise) {
      return null
    }

    // ponytail: parcourt tous les chapitres pour retrouver celui de l'exercice ;
    // un findChapterById au repository quand Prisma remplacera le mock.
    const chapters = (await Promise.all(LANGUAGES.map((l) => this.repository.listChapters(l)))).flat()
    const chapter = chapters.find((c) => c.id === exercise.chapterId)
    if (!chapter) {
      throw new Error(`Chapitre ${exercise.chapterId} introuvable pour ${exercise.slug}.`)
    }

    return {
      slug: exercise.slug,
      title: exercise.title,
      position: exercise.position,
      statement: exercise.statement,
      functionName: exercise.functionName,
      starterCode: exercise.starterCode,
      hints: exercise.hints,
      // La contrainte SQL `exercises_tests_not_empty` garantit un tableau.
      tests: exercise.tests as unknown as TestCase[],
      chapter: { slug: chapter.slug, title: chapter.title },
      next: await this.findNext(
        exercise,
        chapter,
        chapters.filter((c) => c.language === chapter.language),
      ),
    }
  }

  private async summarize(chapter: Chapter): Promise<ChapterSummary> {
    const exercises = await this.repository.listExercises(chapter.id)
    return {
      slug: chapter.slug,
      title: chapter.title,
      position: chapter.position,
      exercises: exercises.map(toSummary),
    }
  }

  private async findNext(
    exercise: Exercise,
    chapter: Chapter,
    languageChapters: readonly Chapter[],
  ): Promise<ExerciseLink | null> {
    const siblings = await this.repository.listExercises(chapter.id)
    const nextInChapter = siblings.find((e) => e.position > exercise.position)
    if (nextInChapter) {
      return { slug: nextInChapter.slug, chapterSlug: chapter.slug }
    }

    // Un chapitre vide est saute : on suggere le premier exercice qui existe.
    for (const next of languageChapters.filter((c) => c.position > chapter.position)) {
      const [first] = await this.repository.listExercises(next.id)
      if (first) {
        return { slug: first.slug, chapterSlug: next.slug }
      }
    }
    return null
  }
}
