import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import express from 'express'

import { InMemoryExerciseRepository } from '../repositories/exercise.repository.ts'
import { InMemoryLessonRepository } from '../repositories/lesson.repository.ts'
import type { TrackRepository } from '../repositories/track.repository.ts'
import { InMemoryTrackRepository } from '../repositories/track.repository.ts'
import { ExerciseService } from '../services/exercise.service.ts'
import { LessonService } from '../services/lesson.service.ts'
import { TrackService } from '../services/track.service.ts'
import {
  ExecutionController,
  ExerciseController,
  LessonController,
  TrackController,
} from './index.ts'

interface TrackRow {
  readonly slug: string
  readonly programmingLanguage: string | null
  readonly prerequisite: { readonly slug: string } | null
}

interface Envelope {
  readonly success: boolean
  // Forme libre selon la route : verifiee par les assertions de chaque cas.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- charge utile polymorphe selon la route
  readonly data: any
  readonly error: string | null
}

/** Monte l'API comme `index.ts`, sur un port ephemere. */
async function start(
  tracks: TrackRepository = new InMemoryTrackRepository(),
): Promise<{ server: Server; base: string }> {
  const lessons = new InMemoryLessonRepository()
  const exercises = new InMemoryExerciseRepository()
  const app = express()
  app.use(express.json())
  app.use('/api/v1/executions', new ExecutionController().buildRouter())
  app.use(
    '/api/v1',
    new TrackController(new TrackService(tracks, lessons, exercises)).buildRouter(),
  )
  app.use('/api/v1', new LessonController(new LessonService(tracks, lessons)).buildRouter())
  app.use('/api/v1', new ExerciseController(new ExerciseService(tracks, exercises)).buildRouter())
  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, () => resolve(s))
  })
  return { server, base: `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1` }
}

describe('API du contenu (données fictives)', () => {
  let server: Server
  let base: string
  const get = async (path: string) => {
    const res = await fetch(`${base}${path}`)
    const text = await res.text()
    return { status: res.status, text, body: JSON.parse(text) as Envelope }
  }

  beforeAll(async () => {
    ;({ server, base } = await start())
  })
  afterAll(
    () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()))
      }),
  )

  it('GET /tracks liste les parcours, leur langage et leur prérequis', async () => {
    const { status, body } = await get('/tracks')

    expect(status).toBe(200)
    expect(
      body.data.map((t: TrackRow) => [t.slug, t.programmingLanguage, t.prerequisite?.slug ?? null]),
    ).toEqual([
      ['javascript', 'javascript', null],
      ['typescript', 'typescript', 'javascript'],
      ['conception', null, null],
    ])
  })

  it('GET /tracks/:track sert le fil, numéroté de 1 à n, ou 404', async () => {
    const { status, body } = await get('/tracks/typescript')

    expect(status).toBe(200)
    expect(body.data.track).toEqual({
      slug: 'typescript',
      name: 'TypeScript',
      programmingLanguage: 'typescript',
    })
    expect(
      body.data.chapters.map((c: { number: number; slug: string; level: string }) => [
        c.number,
        c.level,
        c.slug,
      ]),
    ).toEqual([
      [1, 'beginner', 'pourquoi-typer'],
      [2, 'beginner', 'types-de-base'],
      [3, 'intermediate', 'generiques'],
      [4, 'intermediate', 'unions-et-affinage'],
      [5, 'ecosystem', 'tsc-et-tsconfig'],
    ])
    const firstLesson = body.data.chapters[0].lessons[0]
    expect(Array.isArray(firstLesson.headings)).toBe(true)
    const lessonWithHeadings = body.data.chapters
      .flatMap((c: { lessons: { headings: { id: string; text: string }[] }[] }) => c.lessons)
      .find((l: { headings: { id: string; text: string }[] }) => l.headings.length > 0)
    expect(lessonWithHeadings).toBeDefined()
    expect(lessonWithHeadings?.headings[0]).toHaveProperty('id')
    expect(lessonWithHeadings?.headings[0]).toHaveProperty('text')

    expect((await get('/tracks/python')).body).toEqual({
      success: false,
      data: null,
      error: 'Parcours introuvable.',
    })
  })

  it('GET une leçon par son chemin complet, et masque les brouillons', async () => {
    const lesson = await get('/tracks/javascript/chapters/dotenv/lessons/dotenv')
    expect(lesson.status).toBe(200)
    expect(lesson.body.data.lastReviewedAt).toBe('2026-09-01T00:00:00.000Z')
    expect(lesson.body.data.chapter.number).toBe(12)

    expect((await get('/tracks/javascript/chapters/modules/lessons/modules')).status).toBe(404)
    expect((await get('/tracks/typescript/chapters/dotenv/lessons/dotenv')).status).toBe(404)
  })

  it('GET un exercice par son chemin complet, sans solution', async () => {
    const { status, text, body } = await get(
      '/tracks/typescript/chapters/generiques/exercises/dernier-ou-defaut',
    )

    expect(status).toBe(200)
    expect(body.data.functionName).toBe('lastOr')
    expect(body.data.track.programmingLanguage).toBe('typescript')
    expect(Object.keys(body.data.testCases[0]).toSorted()).toEqual([
      'arguments',
      'description',
      'expectedResult',
    ])
    expect(body.data.next).toEqual({ chapterSlug: 'generiques', slug: 'envelopper' })
    expect(text.includes('solution')).toBe(false)
    expect(text.includes('return items[items.length - 1]')).toBe(false)
  })

  it('répond 404 pour un exercice sous le mauvais chapitre ou le mauvais parcours', async () => {
    expect(
      (await get('/tracks/typescript/chapters/types-de-base/exercises/dernier-ou-defaut')).status,
    ).toBe(404)
    expect(
      (await get('/tracks/javascript/chapters/generiques/exercises/dernier-ou-defaut')).status,
    ).toBe(404)
  })

  it('ne sert plus les anciennes routes', async () => {
    for (const path of [
      '/languages',
      '/languages/javascript/chapters',
      '/lessons/transverse',
      '/lessons/javascript',
      '/tracks/javascript/chapters',
      '/tracks/javascript/chapters/boucles',
      '/tracks/javascript/chapters/boucles/lessons',
    ]) {
      const res = await fetch(`${base}${path}`)
      expect(res.status).toBe(404)
    }
  })

  it('POST une vérification : 404 hors hiérarchie, 400 sans code', async () => {
    const post = (path: string, body: unknown) =>
      fetch(`${base}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
    const path = '/tracks/javascript/chapters/conditions/exercises/est-pair/verifications'
    expect((await post(path, {})).status).toBe(400)
    expect(
      (await post(path.replace('conditions', 'boucles'), { code: 'function isEven() {}' })).status,
    ).toBe(404)
  })
})

describe('API d’exécution, avant tout appel au moteur', () => {
  let server: Server
  let base: string
  const post = async (body: unknown) => {
    const res = await fetch(`${base}/executions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    return { status: res.status, body: (await res.json()) as Envelope }
  }

  beforeAll(async () => {
    ;({ server, base } = await start())
  })
  afterAll(
    () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()))
      }),
  )

  it('refuse un langage hors de l’enum', async () => {
    const { status, body } = await post({ programmingLanguage: 'python', code: 'print(1)' })

    expect(status).toBe(400)
    expect(body.error ?? '').toMatch(/programmingLanguage/)
  })

  it('applique la préparation du langage : un enum TypeScript est refusé', async () => {
    const { status, body } = await post({ programmingLanguage: 'typescript', code: 'enum A { X }' })

    expect(status).toBe(400)
    expect(body.error ?? '').toMatch(/enum/)
  })
})

describe('API du contenu (panne de la source)', () => {
  let server: Server
  let base: string

  const down = () => Promise.reject(new Error('connexion perdue a postgres:5432'))
  const failing: TrackRepository = {
    listTracks: down,
    findTrackBySlug: down,
    listChapters: down,
    findChapter: down,
  }

  beforeAll(async () => {
    ;({ server, base } = await start(failing))
  })
  afterAll(
    () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()))
      }),
  )

  it('répond 500 avec un message générique, sans détail interne', async () => {
    for (const path of ['/tracks', '/tracks/javascript']) {
      const res = await fetch(`${base}${path}`)
      const text = await res.text()

      expect(res.status).toBe(500)
      expect(JSON.parse(text).success).toBe(false)
      expect(text.includes('postgres')).toBe(false)
    }
  })
})
