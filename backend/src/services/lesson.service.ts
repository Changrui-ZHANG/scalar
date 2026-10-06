/**
 * Lecture de la section Connaissance.
 *
 * Une « section » est ce qui figure dans l'URL apres /connaissance/ : un
 * langage (ses categories propres : Debutant, Intermediaire...) ou une
 * categorie valable pour tous les langages (Conception).
 */

import type { Language, Lesson, LessonCategory } from '../db/schema.ts'
import type { ExerciseRepository } from '../repositories/exercise.repository.ts'
import type { LanguageRepository } from '../repositories/language.repository.ts'
import type { LessonRepository } from '../repositories/lesson.repository.ts'

export interface SectionLink {
  readonly kind: 'language' | 'category'
  readonly slug: string
  readonly label: string
}

export interface LessonSummary {
  readonly slug: string
  readonly title: string
  readonly summary: string
  /** Rang dans sa categorie, a partir de 1. */
  readonly number: number
}

export interface CategoryGroup {
  readonly slug: string
  readonly label: string
  readonly lessons: readonly LessonSummary[]
}

export interface SectionView extends SectionLink {
  readonly groups: readonly CategoryGroup[]
}

/** Lecon citee hors de sa section : raccourci « Revoir le cours ». */
export interface LessonLink extends LessonSummary {
  readonly section: SectionLink
}

export interface LessonDetail extends LessonSummary {
  readonly content: string
  /** Date ISO de derniere relecture, surtout utile aux fiches d'ecosysteme. */
  readonly reviewedAt: string | null
  readonly section: SectionLink
  readonly category: { readonly slug: string; readonly label: string; readonly size: number }
  /** Chapitres ou s'exercer. */
  readonly chapters: readonly {
    readonly languageSlug: string
    readonly slug: string
    readonly title: string
    readonly number: number
  }[]
  /** Voisins dans la section : les categories s'enchainent. */
  readonly previous: { readonly slug: string; readonly title: string } | null
  readonly next: { readonly slug: string; readonly title: string } | null
}

export interface TrackChapter {
  readonly slug: string
  readonly title: string
  readonly number: number
  readonly lessons: readonly { readonly slug: string; readonly title: string; readonly summary: string }[]
  readonly exercises: readonly {
    readonly slug: string
    readonly title: string
    readonly statement: string
  }[]
}

export interface TrackView {
  readonly language: { readonly slug: string; readonly label: string }
  readonly chapters: readonly TrackChapter[]
}

type Section =
  | { readonly kind: 'language'; readonly language: Language }
  | { readonly kind: 'category'; readonly category: LessonCategory }

export class LessonService {
  private readonly languages: LanguageRepository
  private readonly lessons: LessonRepository
  private readonly exercises: ExerciseRepository

  constructor(
    languages: LanguageRepository,
    lessons: LessonRepository,
    exercises: ExerciseRepository,
  ) {
    this.languages = languages
    this.lessons = lessons
    this.exercises = exercises
  }

  /** La section et ses lecons groupees par categorie, ou null si elle n'existe pas. */
  async getSection(sectionSlug: string): Promise<SectionView | null> {
    const section = await this.resolveSection(sectionSlug)
    if (!section) {
      return null
    }
    const categories = await this.categoriesOf(section)
    const lessons = await this.lessonsOf(section)
    return {
      ...toSectionLink(section),
      groups: categories
        .map((c) => ({
          slug: c.slug,
          label: c.label,
          lessons: lessons.filter((l) => l.categoryId === c.id).map((l, i) => toSummary(l, i + 1)),
        }))
        .filter((g) => g.lessons.length > 0),
    }
  }

  /** Les categories valables pour tous les langages, pour l'accueil de Connaissance. */
  async listTransverseSections(): Promise<readonly SectionView[]> {
    const categories = (await this.lessons.listCategories()).filter(
      (c) => c.scope === 'all_languages',
    )
    const sections = await Promise.all(categories.map((c) => this.getSection(c.slug)))
    return sections.filter((s): s is SectionView => s !== null && s.groups.length > 0)
  }

  async getLesson(sectionSlug: string, lessonSlug: string): Promise<LessonDetail | null> {
    const section = await this.resolveSection(sectionSlug)
    if (!section) {
      return null
    }
    const languageId = section.kind === 'language' ? section.language.id : null
    const lesson = await this.lessons.findLesson(languageId, lessonSlug)
    // Une lecon « tous langages » d'une autre categorie n'appartient pas a cette section.
    if (!lesson || (section.kind === 'category' && lesson.categoryId !== section.category.id)) {
      return null
    }

    const categories = await this.lessons.listCategories()
    const category = categories.find((c) => c.id === lesson.categoryId)
    if (!category) {
      throw new Error(`Categorie ${lesson.categoryId} introuvable pour ${lesson.slug}.`)
    }
    const programme = await this.programmeOf(section)
    const index = programme.findIndex((l) => l.id === lesson.id)
    const inCategory = programme.filter((l) => l.categoryId === lesson.categoryId)

    return {
      ...toSummary(lesson, inCategory.findIndex((l) => l.id === lesson.id) + 1),
      content: lesson.content,
      reviewedAt: lesson.reviewedAt?.toISOString() ?? null,
      section: toSectionLink(section),
      category: { slug: category.slug, label: category.label, size: inCategory.length },
      chapters: await this.chaptersOf(lesson),
      previous: toNeighbour(programme[index - 1]),
      next: toNeighbour(programme[index + 1]),
    }
  }

  /**
   * Fil d'un parcours : chaque chapitre avec ses lecons puis ses exercices,
   * dans l'ordre. De quoi numeroter les episodes et chercher dedans en un appel.
   *
   * Une lecon liee a plusieurs chapitres n'apparait qu'au premier : le fil ne
   * repete rien. Seules les lecons propres au langage en font partie.
   */
  async getTrack(languageSlug: string): Promise<TrackView | null> {
    const language = await this.languages.findLanguageBySlug(languageSlug)
    if (!language) {
      return null
    }
    const chapters = await this.exercises.listChapters(language.id)
    const loaded = await Promise.all(
      chapters.map(async (chapter) => ({
        chapter,
        lessons: (await this.lessons.listLessonsForChapter(chapter.id)).filter(
          (l) => l.languageId === language.id,
        ),
        exercises: await this.exercises.listExercises(chapter.id),
      })),
    )
    return {
      language: { slug: language.slug, label: language.label },
      chapters: loaded.map(({ chapter, lessons, exercises }, i) => {
        const earlier = new Set(loaded.slice(0, i).flatMap((c) => c.lessons.map((l) => l.id)))
        return {
          slug: chapter.slug,
          title: chapter.title,
          number: i + 1,
          lessons: lessons
            .filter((l) => !earlier.has(l.id))
            .map((l) => ({ slug: l.slug, title: l.title, summary: l.summary })),
          exercises: exercises.map((e) => ({ slug: e.slug, title: e.title, statement: e.statement })),
        }
      }),
    }
  }

  /** Lecons a relire pour un chapitre, ou null si le chapitre n'existe pas. */
  async listLessonsForChapter(
    languageSlug: string,
    chapterSlug: string,
  ): Promise<readonly LessonLink[] | null> {
    const language = await this.languages.findLanguageBySlug(languageSlug)
    const chapter = language && (await this.exercises.findChapter(language.id, chapterSlug))
    if (!language || !chapter) {
      return null
    }
    const lessons = await this.lessons.listLessonsForChapter(chapter.id)
    return Promise.all(
      lessons.map(async (lesson) => {
        const section = await this.sectionOfLesson(lesson)
        const inCategory = (await this.programmeOf(section)).filter(
          (l) => l.categoryId === lesson.categoryId,
        )
        return {
          ...toSummary(lesson, inCategory.findIndex((l) => l.id === lesson.id) + 1),
          section: toSectionLink(section),
        }
      }),
    )
  }

  private async resolveSection(slug: string): Promise<Section | null> {
    const language = await this.languages.findLanguageBySlug(slug)
    if (language) {
      return { kind: 'language', language }
    }
    const category = await this.lessons.findCategoryBySlug(slug)
    return category?.scope === 'all_languages' ? { kind: 'category', category } : null
  }

  private async sectionOfLesson(lesson: Lesson): Promise<Section> {
    if (lesson.languageId !== null) {
      const language = await this.languages.findLanguageById(lesson.languageId)
      if (language) {
        return { kind: 'language', language }
      }
    }
    const category = (await this.lessons.listCategories()).find((c) => c.id === lesson.categoryId)
    if (!category) {
      throw new Error(`Section introuvable pour la lecon ${lesson.slug}.`)
    }
    return { kind: 'category', category }
  }

  /** Categories affichees dans une section, dans l'ordre du programme. */
  private async categoriesOf(section: Section): Promise<readonly LessonCategory[]> {
    if (section.kind === 'category') {
      return [section.category]
    }
    return (await this.lessons.listCategories()).filter((c) => c.scope === 'per_language')
  }

  private async lessonsOf(section: Section): Promise<readonly Lesson[]> {
    if (section.kind === 'language') {
      return this.lessons.listLessons(section.language.id)
    }
    return (await this.lessons.listLessons(null)).filter(
      (l) => l.categoryId === section.category.id,
    )
  }

  /** Suite de lecons d'une section : categorie par categorie, puis par position. */
  private async programmeOf(section: Section): Promise<readonly Lesson[]> {
    const categories = await this.categoriesOf(section)
    const lessons = await this.lessonsOf(section)
    return categories.flatMap((c) => lessons.filter((l) => l.categoryId === c.id))
  }

  private async chaptersOf(lesson: Lesson): Promise<LessonDetail['chapters']> {
    const ids = await this.lessons.listChapterIds(lesson.id)
    const chapters = await Promise.all(ids.map((id) => this.exercises.findChapterById(id)))
    const links = await Promise.all(
      chapters.map(async (chapter) => {
        if (!chapter) {
          return null
        }
        const language = await this.languages.findLanguageById(chapter.languageId)
        if (!language) {
          return null
        }
        const siblings = await this.exercises.listChapters(language.id)
        return {
          languageSlug: language.slug,
          slug: chapter.slug,
          title: chapter.title,
          number: siblings.findIndex((c) => c.id === chapter.id) + 1,
        }
      }),
    )
    // Un chapitre non publie ou d'un langage non publie n'est pas propose.
    return links
      .filter((l): l is NonNullable<typeof l> => l !== null)
      .toSorted((a, b) => a.languageSlug.localeCompare(b.languageSlug) || a.number - b.number)
  }
}

function toSectionLink(section: Section): SectionLink {
  return section.kind === 'language'
    ? { kind: 'language', slug: section.language.slug, label: section.language.label }
    : { kind: 'category', slug: section.category.slug, label: section.category.label }
}

function toSummary(lesson: Lesson, number: number): LessonSummary {
  return { slug: lesson.slug, title: lesson.title, summary: lesson.summary, number }
}

function toNeighbour(lesson: Lesson | undefined): LessonDetail['previous'] {
  return lesson ? { slug: lesson.slug, title: lesson.title } : null
}
