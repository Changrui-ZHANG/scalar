import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { spawnSync } from 'node:child_process'
import { PrismaClient } from '@prisma/client'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { migrateTestDatabase } from '../database.fixtures.ts'
import { buildApp } from '../../../backend/src/app.ts'
import { config } from '../../../backend/src/config.ts'
import { MESSAGES } from '../../../backend/src/constants.ts'
import { seedDatabase } from '../../../backend/src/database/seed.ts'
import { PrismaExerciseRepository } from '../../../backend/src/repository/prisma-exercise.repository.ts'
import { PrismaLessonRepository } from '../../../backend/src/repository/prisma-lesson.repository.ts'
import { PrismaPlacementRepository } from '../../../backend/src/repository/prisma-placement.repository.ts'
import { PrismaQuestionnaireRepository } from '../../../backend/src/repository/prisma-questionnaire.repository.ts'
import { PrismaTrackRepository } from '../../../backend/src/repository/prisma-track.repository.ts'

// L'application telle que main.ts la monte en CONTENT_SOURCE=database ; seul Piston est simule.
// Vide la base : jamais DATABASE_URL, toujours la base de test.
const url = process.env.DATABASE_URL_TEST
const prisma = new PrismaClient({ datasourceUrl: url })

const IS_EVEN = '/tracks/javascript/chapters/conditions/exercises/est-pair'
const realFetch = globalThis.fetch

// Piston simule par un vrai processus Node : le harnais de correction s'execute pour de vrai.
function fakePiston() {
  vi.spyOn(globalThis, 'fetch').mockImplementation((url, init) => {
    if (!String(url).startsWith(config.PISTON_URL)) {
      return realFetch(url, init)
    }
    const code = JSON.parse(String(init?.body)).files[0].content as string
    const run = spawnSync(process.execPath, ['-e', code], { encoding: 'utf8' })
    return Promise.resolve(
      Response.json({
        run: {
          stdout: run.stdout,
          stderr: run.stderr,
          output: run.stdout + run.stderr,
          code: run.status,
          signal: null,
          status: run.status === 0 ? null : 'RE',
        },
      }),
    )
  })
}

describe.skipIf(!url)('API sur la vraie base', () => {
  let server: Server
  let base: string
  const get = async (path: string) => {
    const res = await realFetch(`${base}${path}`)
    const text = await res.text()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- charge utile polymorphe selon la route
    return { status: res.status, text, data: JSON.parse(text).data as any }
  }
  const verify = async (code: string) => {
    const res = await realFetch(`${base}${IS_EVEN}/verifications`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- charge utile polymorphe selon la route
    return { status: res.status, data: ((await res.json()) as { data: any }).data }
  }

  beforeAll(async () => {
    await migrateTestDatabase(prisma, url!)
    await seedDatabase(prisma)
    const app = buildApp({
      tracks: new PrismaTrackRepository(prisma),
      lessons: new PrismaLessonRepository(prisma),
      exercises: new PrismaExerciseRepository(prisma),
      questionnaire: new PrismaQuestionnaireRepository(prisma),
      placements: new PrismaPlacementRepository(prisma),
      contentSource: 'database',
      isDatabaseUp: async () => (await prisma.$queryRaw`SELECT 1`) !== null,
    })
    server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, () => resolve(s))
    })
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`
  }, 60_000)
  afterEach(() => {
    vi.restoreAllMocks()
  })
  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()))
    await prisma.$disconnect()
  })

  it('annonce la base comme source du contenu, connectée', async () => {
    expect(await (await realFetch(`${base}/health`)).json()).toEqual({
      status: 'ok',
      content: 'database',
      database: 'connected',
    })
  })

  it('sert le parcours d’un apprenant : parcours, fil, leçon, exercice sans solution', async () => {
    const tracks = await get('/tracks')
    expect(tracks.status).toBe(200)
    expect(tracks.data.map((t: { slug: string }) => t.slug)).toEqual([
      'javascript',
      'typescript',
      'conception',
    ])

    const track = await get('/tracks/javascript')
    expect(track.data.chapters[0]).toMatchObject({ number: 1, slug: 'syntaxe-et-nommage' })

    const lesson = await get('/tracks/javascript/chapters/dotenv/lessons/dotenv')
    expect(lesson.data).toMatchObject({
      lastReviewedAt: '2026-09-01T00:00:00.000Z',
      chapter: { number: 12 },
    })

    const exercise = await get(IS_EVEN)
    expect(exercise.status).toBe(200)
    expect(exercise.data.functionName).toBe('isEven')
    expect(exercise.text.includes('solution')).toBe(false)
  })

  it('corrige un exercice dont les cas viennent de la base, cachés compris', async () => {
    fakePiston()

    const right = await verify('function isEven(n) { return n % 2 === 0 }')
    const wrong = await verify('function isEven(n) { return true }')

    expect(right.status).toBe(200)
    expect(right.data.passed).toBe(true)
    expect(right.data.passedCount).toBe(right.data.total)
    expect(wrong.data.passed).toBe(false)
  })

  it('suit la base : un exercice repassé en brouillon n’est plus servi ni corrigé', async () => {
    await prisma.exercise.updateMany({ where: { slug: 'est-pair' }, data: { status: 'draft' } })
    try {
      expect((await get(IS_EVEN)).status).toBe(404)
      const res = await verify('function isEven(n) { return n % 2 === 0 }')
      expect(res.status).toBe(404)
      expect((await get('/tracks/javascript/chapters/modules/lessons/modules')).status).toBe(404)
    } finally {
      await seedDatabase(prisma)
    }
  })

  it('positionne un visiteur à partir du questionnaire en base, et enregistre son résultat', async () => {
    fakePiston()
    const questions = (await get('/questionnaire')).data as {
      id: number
      kind: string
      functionName: string | null
      options: { id: number; label: string }[]
    }[]
    const rows = await prisma.questionnaireOption.findMany()
    const best = (questionId: number) =>
      rows.filter((o) => o.questionId === questionId).reduce((a, b) => (b.score > a.score ? b : a))
        .id
    const solutions: Record<string, string> = {
      ajouter: 'function ajouter(a, b) { return a + b }',
      estPalindrome: 'function estPalindrome(s) { return s === [...s].reverse().join("") }',
      factorielle: 'function factorielle(n) { return n <= 1 ? 1 : n * factorielle(n - 1) }',
    }

    const res = await realFetch(`${base}/questionnaire/results`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        choices: questions
          .filter((q) => q.kind !== 'code')
          .map((q) => ({ questionId: q.id, optionId: best(q.id) })),
        submissions: questions
          .filter((q) => q.kind === 'code')
          .map((q) => ({ questionId: q.id, code: solutions[q.functionName!] })),
      }),
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- charge utile de la route
    const { data } = (await res.json()) as { data: any }

    expect(res.status).toBe(200)
    expect(data).toMatchObject({ score: 100, level: 'advanced', track: { slug: 'javascript' } })
    const saved = await prisma.placement.findUniqueOrThrow({ where: { id: data.placementId } })
    expect(saved).toMatchObject({ score: 100, level: 'advanced', userId: null, practical: 1 })
  })

  it('répond 404 JSON pour un contenu absent de la base', async () => {
    const res = await realFetch(`${base}/tracks/python`)

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({
      success: false,
      data: null,
      error: MESSAGES.trackNotFound,
    })
  })
})
