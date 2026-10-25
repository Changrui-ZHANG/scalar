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

/**
 * Tables de contenu, des feuilles vers les racines. CASCADE vide aussi ce qui
 * pointe vers un episode (progression des apprenants) : ses ids ne designeraient
 * plus le meme contenu.
 */
const TABLES = [
  'exercise_hints',
  'exercise_test_cases',
  'lesson_objectives',
  'exercises',
  'lessons',
  'episodes',
  'chapters',
  'tracks',
] as const

/** Tables dont le seed fournit les ids : leur sequence doit repartir apres le plus grand. */
const TABLES_WITH_GIVEN_IDS = ['exercise_test_cases', 'episodes', 'chapters', 'tracks'] as const

/**
 * Les donnees du depot numerotent lecons et exercices chacun de leur cote ;
 * en base, ils partagent les ids et les positions des episodes. Meme regle que
 * la migration `*_episodes_learners` : les lecons gardent leur id, les
 * exercices sont decales apres la plus grande lecon, et passent apres les
 * lecons de leur chapitre.
 */
export function toEpisodes(content: Content) {
  const exerciseOffset = Math.max(0, ...content.lessons.map((l) => l.id))
  const lastLessonPosition = new Map<number, number>()
  for (const l of content.lessons) {
    lastLessonPosition.set(
      l.chapterId,
      Math.max(lastLessonPosition.get(l.chapterId) ?? 0, l.position),
    )
  }
  const episode = (
    row: Lesson | Exercise,
    type: 'lesson' | 'exercise',
    id: number,
    position: number,
  ) => ({
    id,
    chapterId: row.chapterId,
    type,
    slug: row.slug,
    position,
    title: row.title,
    status: row.status,
    firstPublishedAt: row.firstPublishedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  })
  const exerciseId = (id: number) => id + exerciseOffset

  return {
    episodes: [
      ...content.lessons.map((l) => episode(l, 'lesson', l.id, l.position)),
      ...content.exercises.map((e) =>
        episode(
          e,
          'exercise',
          exerciseId(e.id),
          e.position + (lastLessonPosition.get(e.chapterId) ?? 0),
        ),
      ),
    ],
    lessons: content.lessons.map((l) => ({
      episodeId: l.id,
      summary: l.summary,
      body: l.body,
      lastReviewedAt: l.lastReviewedAt,
    })),
    exercises: content.exercises.map((e) => ({
      episodeId: exerciseId(e.id),
      instructions: e.instructions,
      functionName: e.functionName,
      starterCode: e.starterCode,
      solutionCode: e.solutionCode,
      solutionCheckStatus: e.solutionCheckStatus,
      solutionCheckedAt: e.solutionCheckedAt,
    })),
    hints: content.exercises.flatMap((e) =>
      e.hints.map((text, i) => ({ exerciseId: exerciseId(e.id), position: i + 1, text })),
    ),
    testCases: content.testCases.map((t) => ({
      ...t,
      exerciseId: exerciseId(t.exerciseId),
      arguments: t.arguments as Prisma.InputJsonValue,
      expectedResult: t.expectedResult as Prisma.InputJsonValue,
    })),
  }
}

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
    // L'episode d'abord ; sa specialisation suit dans la meme transaction.
    const rows = toEpisodes(content)
    await tx.episode.createMany({ data: rows.episodes })
    await tx.lesson.createMany({ data: rows.lessons })
    await tx.exercise.createMany({ data: rows.exercises })
    await tx.exerciseHint.createMany({ data: rows.hints })
    await tx.exerciseTestCase.createMany({ data: rows.testCases })

    for (const table of TABLES_WITH_GIVEN_IDS) {
      await tx.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 0) + 1, false)`,
      )
    }
  })
}
