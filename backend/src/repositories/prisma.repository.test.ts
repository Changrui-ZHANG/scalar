/**
 * Test d'integration : les depots Prisma disent exactement la meme chose que
 * les depots en memoire, sur une vraie base alimentee par le seed.
 *
 * Remplace le contenu de la base : ne tourne qu'avec DATABASE_TESTS=1, contre
 * une base de developpement (`docker compose up`, port 5433).
 */
import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import { prisma } from '../db/index.ts'
import { seedDatabase } from '../db/seed.ts'
import { ExerciseService } from '../services/exercise.service.ts'
import { LessonService } from '../services/lesson.service.ts'
import { TrackService } from '../services/track.service.ts'
import type { ExerciseRepository } from './exercise.repository.ts'
import { InMemoryExerciseRepository } from './exercise.repository.ts'
import type { LessonRepository } from './lesson.repository.ts'
import { InMemoryLessonRepository } from './lesson.repository.ts'
import {
  PrismaExerciseRepository,
  PrismaLessonRepository,
  PrismaTrackRepository,
} from './prisma.repository.ts'
import type { TrackRepository } from './track.repository.ts'
import { InMemoryTrackRepository } from './track.repository.ts'

const enabled = process.env.DATABASE_TESTS === '1'

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

/** Chaque question posee aux deux sources ; les reponses doivent etre identiques. */
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

describe(
  'dépôts Prisma contre dépôts en mémoire',
  { skip: !enabled && 'DATABASE_TESTS=1 requis' },
  () => {
    before(async () => {
      await seedDatabase(prisma)
    })
    after(async () => {
      await prisma.$disconnect()
    })

    for (const [name, ask] of QUESTIONS) {
      it(`même réponse : ${name}`, async () => {
        assert.deepEqual(await ask(database), await ask(memory))
      })
    }

    it('la base refuse un parcours qui est son propre prérequis', async () => {
      const track = await prisma.track.findUniqueOrThrow({ where: { slug: 'javascript' } })
      await assert.rejects(
        prisma.track.update({ where: { id: track.id }, data: { prerequisiteTrackId: track.id } }),
      )
    })

    it('la base refuse des arguments qui ne forment pas un tableau', async () => {
      const exercise = await prisma.exercise.findFirstOrThrow({ where: { slug: 'fizzbuzz' } })
      await assert.rejects(
        prisma.exerciseTestCase.create({
          data: { exerciseId: exercise.id, position: 99, arguments: 1, expectedResult: 1 },
        }),
      )
    })

    it('la base accepte d’échanger deux positions dans une transaction', async () => {
      const track = await prisma.track.findUniqueOrThrow({ where: { slug: 'javascript' } })
      const [a, b] = await prisma.chapter.findMany({
        where: { trackId: track.id, level: 'beginner' },
        orderBy: { position: 'asc' },
        take: 2,
      })
      assert.ok(a && b)
      await prisma.$transaction([
        prisma.chapter.update({ where: { id: a.id }, data: { position: b.position } }),
        prisma.chapter.update({ where: { id: b.id }, data: { position: a.position } }),
      ])
      // Remise en l'etat pour les autres tests.
      await seedDatabase(prisma)
    })
  },
)
