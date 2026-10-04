/**
 * Lecture des parcours : langages, chapitres, exercices.
 *
 * Tout ce qui sort d'ici est destine au navigateur : la solution d'un exercice
 * et ses cas de test caches n'y figurent jamais.
 */

import type { Chapter, Exercise, Language, LanguageRuntime } from '../db/schema.ts'
import type { ExerciseRepository } from '../repositories/exercise.repository.ts'
import type { LanguageRepository } from '../repositories/language.repository.ts'

export interface LanguageLink {
  readonly slug: string
  readonly label: string
}

export interface LanguageSummary extends LanguageLink {
  readonly summary: string
  /** Langage a connaitre avant celui-ci, s'il y en a un. */
  readonly prerequisite: LanguageLink | null
}

export interface ExerciseSummary {
  readonly slug: string
  readonly title: string
  /** Rang affiche, a partir de 1 : l'ordre reel, jamais la valeur de `position`. */
  readonly number: number
}

export interface ChapterSummary {
  readonly slug: string
  readonly title: string
  readonly number: number
  readonly exercises: readonly ExerciseSummary[]
}

export interface ChapterDetail extends ChapterSummary {
  readonly language: LanguageLink
  readonly summary: string
}

export interface TestCaseView {
  readonly args: readonly unknown[]
  readonly expected: unknown
  readonly label: string | null
}

export interface PublicExercise {
  readonly slug: string
  readonly title: string
  /** Rang dans le chapitre : l'exercice 1.2 a le numero 2. */
  readonly number: number
  readonly statement: string
  readonly functionName: string
  readonly starterCode: string
  readonly hints: readonly string[]
  /** Cas visibles seulement. */
  readonly testCases: readonly TestCaseView[]
  /** `runtime` dit au navigateur ce que l'execution verifie : les types, ou non. */
  readonly language: LanguageLink & { readonly runtime: LanguageRuntime }
  readonly chapter: { readonly slug: string; readonly title: string; readonly number: number }
  /** Exercice suggere ensuite : suivant du chapitre, sinon premier du chapitre suivant. */
  readonly next: { readonly chapterSlug: string; readonly slug: string } | null
}

const toLink = (l: Language): LanguageLink => ({ slug: l.slug, label: l.label })
const rank = <T extends { id: number }>(items: readonly T[], item: T): number =>
  items.findIndex((i) => i.id === item.id) + 1

export class ExerciseService {
  private readonly languages: LanguageRepository
  private readonly repository: ExerciseRepository

  constructor(languages: LanguageRepository, repository: ExerciseRepository) {
    this.languages = languages
    this.repository = repository
  }

  async listLanguages(): Promise<readonly LanguageSummary[]> {
    const languages = await this.languages.listLanguages()
    return languages.map((l) => {
      const prerequisite = languages.find((p) => p.id === l.prerequisiteLanguageId)
      return { ...toLink(l), summary: l.summary, prerequisite: prerequisite ? toLink(prerequisite) : null }
    })
  }

  /** Chapitres d'un langage, ou null si le langage n'est pas propose. */
  async listChapters(languageSlug: string): Promise<readonly ChapterSummary[] | null> {
    const language = await this.languages.findLanguageBySlug(languageSlug)
    if (!language) {
      return null
    }
    const chapters = await this.repository.listChapters(language.id)
    return Promise.all(chapters.map((c, i) => this.summarize(c, i + 1)))
  }

  async getChapter(languageSlug: string, chapterSlug: string): Promise<ChapterDetail | null> {
    const language = await this.languages.findLanguageBySlug(languageSlug)
    const chapter = language && (await this.repository.findChapter(language.id, chapterSlug))
    if (!language || !chapter) {
      return null
    }
    const siblings = await this.repository.listChapters(language.id)
    return {
      ...(await this.summarize(chapter, rank(siblings, chapter))),
      language: toLink(language),
      summary: chapter.summary,
    }
  }

  async getExercise(
    languageSlug: string,
    chapterSlug: string,
    exerciseSlug: string,
  ): Promise<PublicExercise | null> {
    const language = await this.languages.findLanguageBySlug(languageSlug)
    const chapter = language && (await this.repository.findChapter(language.id, chapterSlug))
    const exercise = chapter && (await this.repository.findExercise(chapter.id, exerciseSlug))
    if (!language || !chapter || !exercise) {
      return null
    }

    const chapters = await this.repository.listChapters(language.id)
    const siblings = await this.repository.listExercises(chapter.id)
    const testCases = await this.repository.listTestCases(exercise.id)

    return {
      slug: exercise.slug,
      title: exercise.title,
      number: rank(siblings, exercise),
      statement: exercise.statement,
      functionName: exercise.functionName,
      starterCode: exercise.starterCode,
      hints: exercise.hints,
      testCases: testCases
        .filter((t) => !t.isHidden)
        // La contrainte `exercise_test_cases_args_array` garantit un tableau.
        .map((t) => ({ args: t.args as unknown[], expected: t.expected, label: t.label })),
      language: { ...toLink(language), runtime: language.runtime },
      chapter: { slug: chapter.slug, title: chapter.title, number: rank(chapters, chapter) },
      next: await this.findNext(exercise, chapter, chapters),
    }
  }

  private async summarize(chapter: Chapter, number: number): Promise<ChapterSummary> {
    const exercises = await this.repository.listExercises(chapter.id)
    return {
      slug: chapter.slug,
      title: chapter.title,
      number,
      exercises: exercises.map((e, i) => ({ slug: e.slug, title: e.title, number: i + 1 })),
    }
  }

  private async findNext(
    exercise: Exercise,
    chapter: Chapter,
    chapters: readonly Chapter[],
  ): Promise<PublicExercise['next']> {
    const siblings = await this.repository.listExercises(chapter.id)
    const nextInChapter = siblings[rank(siblings, exercise)]
    if (nextInChapter) {
      return { chapterSlug: chapter.slug, slug: nextInChapter.slug }
    }

    // Un chapitre vide est saute : on suggere le premier exercice qui existe.
    for (const next of chapters.slice(rank(chapters, chapter))) {
      const [first] = await this.repository.listExercises(next.id)
      if (first) {
        return { chapterSlug: next.slug, slug: first.slug }
      }
    }
    return null
  }
}
