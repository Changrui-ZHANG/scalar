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

import type { Chapter, Exercise, ExerciseTestCase, Lesson, Track } from './schema.ts'
import { MOCK_CHAPTERS } from '../repositories/chapter.mock.ts'
import { MOCK_EXERCISE_TEST_CASES, MOCK_EXERCISES } from '../repositories/exercise.mock.ts'
import { MOCK_LESSONS } from '../repositories/lesson.mock.ts'
import { MOCK_TRACKS } from '../repositories/track.mock.ts'
import { toJavaScript } from '../services/execution.service.ts'

export interface Content {
  readonly tracks: readonly Track[]
  readonly chapters: readonly Chapter[]
  readonly lessons: readonly Lesson[]
  readonly exercises: readonly Exercise[]
  readonly testCases: readonly ExerciseTestCase[]
}

export const MOCK_CONTENT: Content = {
  tracks: MOCK_TRACKS,
  chapters: MOCK_CHAPTERS,
  lessons: MOCK_LESSONS,
  exercises: MOCK_EXERCISES,
  testCases: MOCK_EXERCISE_TEST_CASES,
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
    // Passage par JSON : les valeurs d'un autre contexte `vm` n'ont pas les
    // memes prototypes, et c'est de toute facon ce que verra le client.
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

/** Tables de contenu, des feuilles vers les racines. */
const TABLES = ['exercise_test_cases', 'exercises', 'lessons', 'chapters', 'tracks'] as const

/** Vrai si aucun parcours n'est en base : premier demarrage d'un depot clone. */
export async function isContentEmpty(prisma: PrismaClient): Promise<boolean> {
  return (await prisma.track.count()) === 0
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

    // Ids fournis explicitement : chaque sequence doit repartir apres le plus grand.
    for (const table of TABLES) {
      await tx.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 0) + 1, false)`,
      )
    }
  })
}
