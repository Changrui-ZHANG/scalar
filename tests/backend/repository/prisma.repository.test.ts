import { PrismaClient } from '@prisma/client'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { CONTENT, seedDatabase } from '../../../backend/src/database/seed.ts'
import { ExerciseService } from '../../../backend/src/service/exercise.service.ts'
import { LessonService } from '../../../backend/src/service/lesson.service.ts'
import { TrackService } from '../../../backend/src/service/track.service.ts'
import type { ExerciseRepository } from '../../../backend/src/repository/exercise.repository.ts'
import { InMemoryExerciseRepository } from '../../../backend/src/repository/exercise.repository.ts'
import type { LessonRepository } from '../../../backend/src/repository/lesson.repository.ts'
import { InMemoryLessonRepository } from '../../../backend/src/repository/lesson.repository.ts'
import {
  PrismaExerciseRepository,
  PrismaLessonRepository,
  PrismaTrackRepository,
} from '../../../backend/src/repository/prisma.repository.ts'
import type { TrackRepository } from '../../../backend/src/repository/track.repository.ts'
import { InMemoryTrackRepository } from '../../../backend/src/repository/track.repository.ts'

// Vide la base : jamais DATABASE_URL, toujours la base de test.
const url = process.env.DATABASE_URL_TEST
const prisma = new PrismaClient({ datasourceUrl: url })

interface Services {
  readonly tracks: TrackService
  readonly lessons: LessonService
  readonly exercises: ExerciseService
}

function services(
  tracks: TrackRepository,
  lessons: LessonRepository,
  exercises: ExerciseRepository,
): Services {
  return {
    tracks: new TrackService(tracks, lessons, exercises),
    lessons: new LessonService(tracks, lessons),
    exercises: new ExerciseService(tracks, exercises),
  }
}

const memory = services(
  new InMemoryTrackRepository(),
  new InMemoryLessonRepository(),
  new InMemoryExerciseRepository(),
)
const database = services(
  new PrismaTrackRepository(prisma),
  new PrismaLessonRepository(prisma),
  new PrismaExerciseRepository(prisma),
)

const QUESTIONS: ReadonlyArray<readonly [string, (s: Services) => Promise<unknown>]> = [
  ['parcours', (s) => s.tracks.listTracks()],
  ['fil javascript', (s) => s.tracks.getTrack('javascript')],
  ['fil typescript', (s) => s.tracks.getTrack('typescript')],
  ['fil sans langage', (s) => s.tracks.getTrack('conception')],
  ['parcours inconnu', (s) => s.tracks.getTrack('python')],
  ['lecon', (s) => s.lessons.getLesson('javascript', 'fonctions', 'fonctions')],
  ['lecon relue', (s) => s.lessons.getLesson('javascript', 'dotenv', 'dotenv')],
  [
    'lecon sans langage',
    (s) => s.lessons.getLesson('conception', 'bases-de-la-conception', 'architecture-mvc'),
  ],
  ['brouillon', (s) => s.lessons.getLesson('javascript', 'modules', 'modules')],
  ['exercice', (s) => s.exercises.getExercise('javascript', 'boucles', 'fizzbuzz')],
  ['exercice typescript', (s) => s.exercises.getExercise('typescript', 'generiques', 'envelopper')],
  ['a corriger', (s) => s.exercises.findForVerification('javascript', 'conditions', 'est-pair')],
]

describe.skipIf(!url)('dépôts Prisma contre dépôts en mémoire', () => {
  beforeAll(async () => {
    execSync('npx prisma migrate deploy', {
      cwd: fileURLToPath(new URL('../../../backend/', import.meta.url)),
      env: { ...process.env, DATABASE_URL: url },
      stdio: 'ignore',
    })
    await seedDatabase(prisma)
  }, 60_000)
  afterAll(async () => {
    await prisma.$disconnect()
  })

  for (const [name, ask] of QUESTIONS) {
    it(`même réponse : ${name}`, async () => {
      expect(await ask(database)).toEqual(await ask(memory))
    })
  }

  it('la base refuse un parcours qui est son propre prérequis', async () => {
    const track = await prisma.track.findUniqueOrThrow({ where: { slug: 'javascript' } })
    await expect(
      prisma.track.update({ where: { id: track.id }, data: { prerequisiteTrackId: track.id } }),
    ).rejects.toThrow()
  })

  it('la base refuse des arguments qui ne forment pas un tableau', async () => {
    const exercise = await prisma.exercise.findFirstOrThrow({ where: { slug: 'fizzbuzz' } })
    await expect(
      prisma.exerciseTestCase.create({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test de refus d'arguments invalides
        data: { exerciseId: exercise.id, position: 99, arguments: 1 as any, expectedResult: 1 },
      }),
    ).rejects.toThrow()
  })

  it('la base accepte d’échanger deux positions dans une transaction', async () => {
    const track = await prisma.track.findUniqueOrThrow({ where: { slug: 'javascript' } })
    const [a, b] = await prisma.chapter.findMany({
      where: { trackId: track.id, level: 'beginner' },
      orderBy: { position: 'asc' },
      take: 2,
    })
    expect(a && b).toBeTruthy()
    await prisma.$transaction([
      prisma.chapter.update({ where: { id: a!.id }, data: { position: b!.position } }),
      prisma.chapter.update({ where: { id: b!.id }, data: { position: a!.position } }),
    ])
    await seedDatabase(prisma)
  })

  it('un contenu refusé laisse la base intacte', async () => {
    const before = await prisma.exercise.count()
    const [first] = CONTENT.exercises
    const broken = { ...CONTENT, exercises: [{ ...first!, solutionCode: 'function (' }] }

    await expect(seedDatabase(prisma, broken)).rejects.toThrow(/Contenu refusé/)
    expect(await prisma.exercise.count()).toBe(before)
  })
})
