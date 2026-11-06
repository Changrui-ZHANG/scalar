// Remplace tout le contenu de la base, ids compris.

import type { Prisma, PrismaClient } from '@prisma/client'

import { runInNewContext } from 'node:vm'

import { CONTENT_TABLES } from '../constants.ts'
import type { Chapter } from '../entity/chapter.entity.ts'
import type { Exercise } from '../entity/exercise.entity.ts'
import type { ExerciseTestCase } from '../entity/exercise-test-case.entity.ts'
import type { Lesson } from '../entity/lesson.entity.ts'
import type { QuestionnaireOption } from '../entity/questionnaire-option.entity.ts'
import type { QuestionnaireQuestion } from '../entity/questionnaire-question.entity.ts'
import type { QuestionnaireTestCase } from '../entity/questionnaire-test-case.entity.ts'
import type { Track } from '../entity/track.entity.ts'
import { CHAPTERS } from '../content/chapters.ts'
import { EXERCISE_TEST_CASES, EXERCISES } from '../content/exercises.ts'
import { LESSONS } from '../content/lessons.ts'
import {
  QUESTIONNAIRE_OPTIONS,
  QUESTIONNAIRE_QUESTIONS,
  QUESTIONNAIRE_TEST_CASES,
} from '../content/questionnaire.ts'
import { TRACKS } from '../content/tracks.ts'
import { toJavaScript } from '../service/execution.service.ts'

export interface Content {
  readonly tracks: readonly Track[]
  readonly chapters: readonly Chapter[]
  readonly lessons: readonly Lesson[]
  readonly exercises: readonly Exercise[]
  readonly testCases: readonly ExerciseTestCase[]
  readonly questionnaireQuestions: readonly QuestionnaireQuestion[]
  readonly questionnaireOptions: readonly QuestionnaireOption[]
  readonly questionnaireTestCases: readonly QuestionnaireTestCase[]
}

export const CONTENT: Content = {
  tracks: TRACKS,
  chapters: CHAPTERS,
  lessons: LESSONS,
  exercises: EXERCISES,
  testCases: EXERCISE_TEST_CASES,
  questionnaireQuestions: QUESTIONNAIRE_QUESTIONS,
  questionnaireOptions: QUESTIONNAIRE_OPTIONS,
  questionnaireTestCases: QUESTIONNAIRE_TEST_CASES,
}

type Loaded = ((...args: unknown[]) => unknown) | { readonly error: string }

// Contenu de confiance : `vm` suffit ici. Le code des apprenants ne passe que par Piston.
export function validateExercises(content: Content): readonly string[] {
  const problems: string[] = []

  for (const exercise of content.exercises) {
    const chapter = content.chapters.find((c) => c.id === exercise.chapterId)
    const track = content.tracks.find((t) => t.id === chapter?.trackId)
    const cases = content.testCases.filter((t) => t.exerciseId === exercise.id)
    if (!track) {
      problems.push(`${exercise.slug} : parcours introuvable`)
      continue
    }
    const { programmingLanguage } = track
    if (programmingLanguage === null) {
      problems.push(`${exercise.slug} : parcours sans langage de programmation`)
      continue
    }
    if (cases.length === 0) {
      problems.push(`${exercise.slug} : aucun cas de test`)
      continue
    }

    const load = (code: string): Loaded => {
      const converted = toJavaScript(programmingLanguage, code)
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
    // Passage par JSON : les valeurs d'un autre contexte `vm` n'ont pas les memes prototypes.
    const passes = (fn: (...args: unknown[]) => unknown, t: ExerciseTestCase): boolean => {
      try {
        return (
          JSON.stringify(fn(...(t.arguments as unknown[])) ?? null) ===
          JSON.stringify(t.expectedResult)
        )
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
  return problems
}

export async function isContentEmpty(prisma: PrismaClient): Promise<boolean> {
  return (await prisma.track.count()) === 0
}

export async function seedDatabase(
  prisma: PrismaClient,
  content: Content = CONTENT,
): Promise<void> {
  const problems = validateExercises(content)
  if (problems.length > 0) {
    throw new Error(`Contenu refusé :\n- ${problems.join('\n- ')}`)
  }

  await prisma.$transaction(async (tx) => {
    // CASCADE vide aussi exercise_progress et certificates (cles etrangeres vers le contenu).
    await tx.$executeRawUnsafe(`TRUNCATE ${CONTENT_TABLES.join(', ')} RESTART IDENTITY CASCADE`)

    // Les parcours dont un autre depend passent en premier.
    await tx.track.createMany({
      data: content.tracks.toSorted(
        (a, b) => Number(a.prerequisiteTrackId !== null) - Number(b.prerequisiteTrackId !== null),
      ),
    })
    await tx.chapter.createMany({ data: [...content.chapters] })
    await tx.lesson.createMany({ data: [...content.lessons] })
    await tx.exercise.createMany({ data: [...content.exercises] })
    await tx.exerciseTestCase.createMany({
      data: content.testCases.map((t) => ({
        ...t,
        arguments: t.arguments as Prisma.InputJsonValue,
        expectedResult: t.expectedResult as Prisma.InputJsonValue,
      })),
    })
    await tx.questionnaireQuestion.createMany({ data: [...content.questionnaireQuestions] })
    await tx.questionnaireOption.createMany({ data: [...content.questionnaireOptions] })
    await tx.questionnaireTestCase.createMany({
      data: content.questionnaireTestCases.map((t) => ({
        ...t,
        arguments: t.arguments as Prisma.InputJsonValue,
        expectedResult: t.expectedResult as Prisma.InputJsonValue,
      })),
    })

    // Ids fournis explicitement : chaque sequence doit repartir apres le plus grand.
    for (const table of CONTENT_TABLES) {
      await tx.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 0) + 1, false)`,
      )
    }
  })
}
