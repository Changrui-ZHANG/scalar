/**
 * Alimente la base a partir des donnees fictives du depot.
 *
 * Le contenu est redige dans le code tant qu'il n'existe pas d'interface
 * d'edition : le seed remplace donc tout le contenu, ids compris, pour que la
 * base et les fichiers disent exactement la meme chose.
 */
// Remplacement complet du contenu ; passer a des upserts par slug le
// jour ou du contenu sera saisi dans l'application.

import type { Prisma, PrismaClient } from '@prisma/client'
import { runInNewContext } from 'node:vm'

import type {
  Chapter,
  Exercise,
  ExerciseTestCase,
  Language,
  Lesson,
  LessonCategory,
  LessonChapter,
  Questionnaire,
  QuestionnaireQuestion,
} from './schema.ts'
import {
  MOCK_CHAPTERS,
  MOCK_EXERCISE_TEST_CASES,
  MOCK_EXERCISES,
} from '../repositories/exercise.mock.ts'
import { MOCK_LANGUAGES } from '../repositories/language.mock.ts'
import {
  MOCK_LESSON_CATEGORIES,
  MOCK_LESSON_CHAPTERS,
  MOCK_LESSONS,
} from '../repositories/lesson.mock.ts'
import {
  MOCK_QUESTIONNAIRES,
  MOCK_QUESTIONNAIRE_QUESTIONS
} from '../repositories/questionnaire.mock.ts'
import { toJavaScript } from '../services/execution.service.ts'

export interface Content {
  readonly languages: readonly Language[]
  readonly chapters: readonly Chapter[]
  readonly exercises: readonly Exercise[]
  readonly testCases: readonly ExerciseTestCase[]
  readonly categories: readonly LessonCategory[]
  readonly lessons: readonly Lesson[]
  readonly lessonChapters: readonly LessonChapter[]
  readonly questionnaires: readonly Questionnaire[]
  readonly questionnaireQuestions: readonly QuestionnaireQuestion[]
}

export const MOCK_CONTENT: Content = {
  languages: MOCK_LANGUAGES,
  chapters: MOCK_CHAPTERS,
  exercises: MOCK_EXERCISES,
  testCases: MOCK_EXERCISE_TEST_CASES,
  categories: MOCK_LESSON_CATEGORIES,
  lessons: MOCK_LESSONS,
  lessonChapters: MOCK_LESSON_CHAPTERS,
  questionnaires: MOCK_QUESTIONNAIRES,
  questionnaireQuestions: MOCK_QUESTIONNAIRE_QUESTIONS
}

type Loaded = ((...args: unknown[]) => unknown) | { readonly error: string }

/**
 * Verifie chaque exercice comme le fera l'execution reelle : la solution passe
 * tous ses cas, le code de depart n'en passe pas tous. Contenu redige par
 * l'equipe, donc de confiance : `vm` suffit ; le code des apprenants, lui, ne
 * passe que par Piston.
 *
 * @returns les problemes trouves, vide si le contenu est coherent.
 */
export function validateExercises(content: Content): readonly string[] {
  const problems: string[] = []

  for (const exercise of content.exercises) {
    const chapter = content.chapters.find((c) => c.id === exercise.chapterId)
    const language = content.languages.find((l) => l.id === chapter?.languageId)
    const cases = content.testCases.filter((t) => t.exerciseId === exercise.id)
    if (!language) {
      problems.push(`${exercise.slug} : langage introuvable`)
      continue
    }
    if (cases.length === 0) {
      problems.push(`${exercise.slug} : aucun cas de test`)
      continue
    }

    const load = (code: string): Loaded => {
      const converted = toJavaScript(language.runtime, code)
      if (!converted.ok) {
        return { error: converted.error }
      }
      try {
        return runInNewContext(`${converted.code}\n${exercise.functionName}`) as (
          ...args: unknown[]
        ) => unknown
      } catch (error: unknown) {
        return { error: error instanceof Error ? error.message : String(error) }
      }
    }
    // Passage par JSON : les valeurs d'un autre contexte `vm` n'ont pas les
    // memes prototypes, et c'est de toute facon ce que verra le client.
    const passes = (fn: (...args: unknown[]) => unknown, t: ExerciseTestCase): boolean => {
      try {
        return JSON.stringify(fn(...(t.args as unknown[])) ?? null) === JSON.stringify(t.expected)
      } catch {
        return false
      }
    }

    const solution = load(exercise.solutionCode)
    if (typeof solution !== 'function') {
      problems.push(`${exercise.slug} : solution illisible (${solution.error})`)
    } else {
      for (const t of cases.filter((c) => !passes(solution, c))) {
        problems.push(`${exercise.slug} : la solution échoue au cas ${t.position}`)
      }
    }

    const starter = load(exercise.starterCode)
    if (typeof starter === 'function' && cases.every((c) => passes(starter, c))) {
      problems.push(`${exercise.slug} : le code de départ résout déjà l'exercice`)
    }
  }

  // Valider les questionnaires de base
  for (const questionnaire of content.questionnaires) {
    // Vérifier que chaque questionnaire a exactement 10 questions
    const questionnaireQuestions = content.questionnaireQuestions.filter(
      q => q.questionnaireId === questionnaire.id
    )
    if (questionnaireQuestions.length !== 10) {
      problems.push(`${questionnaire.title} : nombre de questions incorrect (${questionnaireQuestions.length}/10)`)
    }

    // Vérifier que la question 2 est toujours la même (sélection de langues)
    const question2 = questionnaireQuestions.find(q => q.position === 2)
    if (!question2 || question2.type !== 'language-selection') {
      problems.push(`${questionnaire.title} : la question 2 doit être la sélection de langues`)
    }

    // Vérifier que les questions 1 à 7 sont des questions non-code (théoriques ou sélection de langues)
    const nonCodeQuestions = questionnaireQuestions.filter(
      q => q.position >= 1 && q.position <= 7 && q.type !== 'code'
    ).length
    if (nonCodeQuestions !== 7) {
      problems.push(`${questionnaire.title} : nombre incorrect de questions non-code en positions 1-7 (${nonCodeQuestions}/7)`)
    }

    // Vérifier que les questions 8 à 10 sont des questions de code
    const codeQuestions = questionnaireQuestions.filter(
      q => q.position >= 8 && q.position <= 10 && q.type === 'code'
    ).length
    if (codeQuestions !== 3) {
      problems.push(`${questionnaire.title} : nombre incorrect de questions de code en positions 8-10 (${codeQuestions}/3)`)
    }
  }

  return problems
}

/** Tables de contenu, des feuilles vers les racines. */
const TABLES = [
  'lesson_chapters',
  'lessons',
  'lesson_categories',
  'exercise_test_cases',
  'exercises',
  'questionnaire_questions',
  'questionnaires',
  'chapters',
  'languages',
] as const

/** Vrai si aucun langage n'est en base : premier demarrage d'un depot clone. */
export async function isContentEmpty(prisma: PrismaClient): Promise<boolean> {
  return (await prisma.language.count()) === 0
}

/**
 * Remplace le contenu de la base par `content`, en une transaction.
 *
 * @throws si le contenu est incoherent : rien n'est ecrit.
 */
export async function seedDatabase(
  prisma: PrismaClient,
  content: Content = MOCK_CONTENT,
): Promise<void> {
  const problems = validateExercises(content)
  if (problems.length > 0) {
    throw new Error(`Contenu refusé :\n- ${problems.join('\n- ')}`)
  }

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`TRUNCATE ${TABLES.join(', ')} RESTART IDENTITY CASCADE`)

    // Les langages dont un autre depend passent en premier.
    await tx.language.createMany({
      data: content.languages.toSorted(
        (a, b) =>
          Number(a.prerequisiteLanguageId !== null) - Number(b.prerequisiteLanguageId !== null),
      ),
    })
    await tx.chapter.createMany({ data: [...content.chapters] })
    await tx.exercise.createMany({ data: [...content.exercises] })
    await tx.exerciseTestCase.createMany({
      data: content.testCases.map((t) => ({
        ...t,
        args: t.args as Prisma.InputJsonValue,
        expected: t.expected as Prisma.InputJsonValue,
      })),
    })
    await tx.lessonCategory.createMany({ data: [...content.categories] })
    await tx.lesson.createMany({ data: [...content.lessons] })
    await tx.lessonChapter.createMany({ data: [...content.lessonChapters] })

    // Créer les questionnaires
    await tx.questionnaire.createMany({
      data: [...content.questionnaires]
    })

    // Créer les questions en utilisant les questions déjà associées aux questionnaires
    const allQuestions = []
    for (const questionnaireMock of content.questionnaires) {
      for (const questionMock of questionnaireMock.questions) {
        const { id, ...questionData } = questionMock
        allQuestions.push({
          ...questionData,
          questionnaireId: questionnaireMock.id
        })
      }
    }
    await tx.questionnaireQuestion.createMany({ data: allQuestions })

    // Ids fournis explicitement : chaque sequence doit repartir apres le plus grand.
    for (const table of TABLES.filter((t) => t !== 'lesson_chapters')) {
      await tx.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 0) + 1, false)`,
      )
    }
  })
}
