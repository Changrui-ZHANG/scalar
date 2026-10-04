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
import { InMemoryExerciseRepository } from './exercise.repository.ts'
import { InMemoryLanguageRepository } from './language.repository.ts'
import { InMemoryLessonRepository } from './lesson.repository.ts'
import {
  PrismaExerciseRepository,
  PrismaLanguageRepository,
  PrismaLessonRepository,
} from './prisma.repository.ts'

const enabled = process.env.DATABASE_TESTS === '1'

const memory = {
  exercises: new ExerciseService(
    new InMemoryLanguageRepository(),
    new InMemoryExerciseRepository(),
  ),
  lessons: new LessonService(
    new InMemoryLanguageRepository(),
    new InMemoryLessonRepository(),
    new InMemoryExerciseRepository(),
  ),
}
const database = {
  exercises: new ExerciseService(
    new PrismaLanguageRepository(prisma),
    new PrismaExerciseRepository(prisma),
  ),
  lessons: new LessonService(
    new PrismaLanguageRepository(prisma),
    new PrismaLessonRepository(prisma),
    new PrismaExerciseRepository(prisma),
  ),
}

/** Chaque question posee aux deux sources ; les reponses doivent etre identiques. */
const QUESTIONS: ReadonlyArray<readonly [string, (s: typeof memory) => Promise<unknown>]> = [
  ['langages', (s) => s.exercises.listLanguages()],
  ['parcours javascript', (s) => s.exercises.listChapters('javascript')],
  ['parcours typescript', (s) => s.exercises.listChapters('typescript')],
  ['langage inconnu', (s) => s.exercises.listChapters('python')],
  ['chapitre', (s) => s.exercises.getChapter('javascript', 'boucles')],
  ['exercice', (s) => s.exercises.getExercise('javascript', 'boucles', 'fizzbuzz')],
  ['exercice typescript', (s) => s.exercises.getExercise('typescript', 'generiques', 'envelopper')],
  ['section langage', (s) => s.lessons.getSection('javascript')],
  ['section transverse', (s) => s.lessons.getSection('conception')],
  ['sections transverses', (s) => s.lessons.listTransverseSections()],
  ['lecon', (s) => s.lessons.getLesson('javascript', 'fonctions')],
  ['lecon transverse', (s) => s.lessons.getLesson('conception', 'architecture-mvc')],
  ['brouillon', (s) => s.lessons.getLesson('javascript', 'modules')],
  ['lecons d’un chapitre', (s) => s.lessons.listLessonsForChapter('typescript', 'types-de-base')],
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

    it('la base refuse une leçon transverse rattachée à un langage', async () => {
      const category = await prisma.lessonCategory.findUniqueOrThrow({
        where: { slug: 'conception' },
      })
      await assert.rejects(
        prisma.lesson.create({
          data: {
            languageId: 1,
            categoryId: category.id,
            categoryScope: 'all_languages',
            slug: 'incoherente',
            position: 99,
            title: 't',
            summary: 's',
            content: 'c',
          },
        }),
      )
    })

    it('la base refuse une portée recopiée de travers', async () => {
      const category = await prisma.lessonCategory.findUniqueOrThrow({
        where: { slug: 'conception' },
      })
      await assert.rejects(
        prisma.lesson.create({
          data: {
            languageId: 1,
            categoryId: category.id,
            categoryScope: 'per_language',
            slug: 'mal-recopiee',
            position: 98,
            title: 't',
            summary: 's',
            content: 'c',
          },
        }),
      )
    })

    it('la base accepte d’échanger deux positions dans une transaction', async () => {
      const [a, b] = await prisma.chapter.findMany({
        where: { languageId: 1 },
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
