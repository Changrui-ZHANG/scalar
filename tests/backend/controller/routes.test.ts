import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { spawnSync } from 'node:child_process'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { buildApp } from '../../../backend/src/app.ts'
import { config } from '../../../backend/src/config.ts'
import { MAX_CODE_BYTES, MESSAGES } from '../../../backend/src/constants.ts'
import { InMemoryExerciseRepository } from '../../../backend/src/repository/exercise.repository.ts'
import { InMemoryLessonRepository } from '../../../backend/src/repository/lesson.repository.ts'
import { InMemoryQuestionnaireRepository } from '../../../backend/src/repository/questionnaire.repository.ts'
import type { TrackRepository } from '../../../backend/src/repository/track.repository.ts'
import { InMemoryTrackRepository } from '../../../backend/src/repository/track.repository.ts'

interface TrackRow {
  readonly slug: string
  readonly programmingLanguage: string | null
  readonly prerequisite: { readonly slug: string } | null
}

interface Envelope {
  readonly success: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- charge utile polymorphe selon la route
  readonly data: any
  readonly error: string | null
}

async function start(
  tracks: TrackRepository = new InMemoryTrackRepository(),
  isDatabaseUp: () => Promise<boolean> = async () => false,
): Promise<{ server: Server; base: string }> {
  const lessons = new InMemoryLessonRepository()
  const exercises = new InMemoryExerciseRepository()
  const app = buildApp({
    tracks,
    lessons,
    exercises,
    questionnaire: new InMemoryQuestionnaireRepository(),
    contentSource: 'mock',
    isDatabaseUp,
  })
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

  it.each([
    ['guillemets', '"'],
    ['caractères de contrôle', '\u0001'],
  ])(
    'un code trop long reçoit le message de taille, même gonflé par l’échappement JSON (%s)',
    async (_cas, char) => {
      const { status, body } = await post({ code: char.repeat(MAX_CODE_BYTES + 1) })

      expect(status).toBe(400)
      expect(body.error ?? '').toMatch(/dépasse la limite/)
    },
  )
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

const realFetch = globalThis.fetch

function fakePiston(engine: (code: string) => Promise<Response>) {
  vi.spyOn(globalThis, 'fetch').mockImplementation((url, init) =>
    String(url).startsWith(config.PISTON_URL)
      ? engine(JSON.parse(String(init?.body)).files[0].content)
      : realFetch(url, init),
  )
}

const runInNode = async (code: string): Promise<Response> => {
  const run = spawnSync(process.execPath, ['-e', code], { encoding: 'utf8' })
  return Response.json({
    run: {
      stdout: run.stdout,
      stderr: run.stderr,
      output: run.stdout + run.stderr,
      code: run.status,
      signal: null,
      status: run.status === 0 ? null : 'RE',
    },
  })
}

describe('API de vérification, avec le moteur', () => {
  let server: Server
  let base: string
  const verify = async (path: string, code: string) => {
    const res = await realFetch(`${base}${path}/verifications`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    return { status: res.status, text: await res.text() }
  }
  const IS_EVEN = '/tracks/javascript/chapters/conditions/exercises/est-pair'

  beforeAll(async () => {
    ;({ server, base } = await start())
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  afterAll(
    () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()))
      }),
  )

  it('valide une solution juste', async () => {
    fakePiston(runInNode)

    const { status, text } = await verify(IS_EVEN, 'function isEven(n) { return n % 2 === 0 }')
    const data = (JSON.parse(text) as Envelope).data

    expect(status).toBe(200)
    expect(data.passed).toBe(true)
    expect(data.passedCount).toBe(data.total)
  })

  it('refuse une solution fausse', async () => {
    fakePiston(runInNode)

    const { status, text } = await verify(IS_EVEN, 'function isEven(n) { return true }')
    const data = (JSON.parse(text) as Envelope).data

    expect(status).toBe(200)
    expect(data.passed).toBe(false)
    expect(data.passedCount).toBeLessThan(data.total)
  })

  it('refuse en 400 une syntaxe TypeScript non prise en charge, sans appeler le moteur', async () => {
    const engine = vi.fn(runInNode)
    fakePiston(engine)

    const { status, text } = await verify(
      '/tracks/typescript/chapters/generiques/exercises/envelopper',
      'enum A { X }',
    )

    expect(status).toBe(400)
    expect(text).toMatch(/enum/)
    expect(engine).not.toHaveBeenCalled()
  })

  it('répond 503 quand le moteur est en panne, sans détail interne', async () => {
    fakePiston(() => Promise.reject(new TypeError('fetch failed: piston:2000')))

    for (const call of [
      () => verify(IS_EVEN, 'function isEven() {}'),
      async () => {
        const res = await realFetch(`${base}/executions`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ code: 'console.log(1)' }),
        })
        return { status: res.status, text: await res.text() }
      },
    ]) {
      const { status, text } = await call()
      expect(status).toBe(503)
      expect(JSON.parse(text).error).toBe(MESSAGES.engineUnavailable)
      expect(text.includes('piston')).toBe(false)
    }
  })

  it('répond 500 quand la lecture de l’exercice échoue, même moteur disponible', async () => {
    fakePiston(runInNode)
    const failing = await start({
      listTracks: () => Promise.reject(new Error('db down')),
      findTrackBySlug: () => Promise.reject(new Error('db down')),
      listChapters: () => Promise.reject(new Error('db down')),
      findChapter: () => Promise.reject(new Error('db down')),
    })
    try {
      const res = await realFetch(`${failing.base}${IS_EVEN}/verifications`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: 'function isEven() {}' }),
      })
      expect(res.status).toBe(500)
      expect(((await res.json()) as Envelope).error).toBe(MESSAGES.contentUnavailable)
    } finally {
      failing.server.close()
    }
  })
})

describe('Enveloppe HTTP commune', () => {
  let server: Server
  let base: string

  beforeAll(async () => {
    ;({ server, base } = await start())
  })
  afterAll(
    () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()))
      }),
  )

  it('répond 400 en JSON à un corps JSON mal formé', async () => {
    const res = await fetch(`${base}/executions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{pas du json',
    })
    const text = await res.text()

    expect(res.status).toBe(400)
    expect(JSON.parse(text)).toEqual({ success: false, data: null, error: MESSAGES.invalidRequest })
    expect(text.includes('SyntaxError')).toBe(false)
  })

  it('répond 404 en JSON sur une route inconnue', async () => {
    const res = await fetch(`${base}/nulle-part`)

    expect(res.status).toBe(404)
    expect(((await res.json()) as Envelope).error).toBe(MESSAGES.routeNotFound)
  })

  it('n’annonce pas Express et interdit le sniffing de type', async () => {
    const res = await fetch(`${base}/tracks`)

    expect(res.headers.get('x-powered-by')).toBeNull()
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
  })

  it('expose la source du contenu et l’état de la base sur /health', async () => {
    const res = await fetch(`${base}/health`)

    expect(await res.json()).toEqual({ status: 'ok', content: 'mock', database: 'disconnected' })
  })

  it('répond 500 en JSON générique à une erreur non prévue, sans détail interne', async () => {
    const crashing = await start(undefined, () => Promise.reject(new Error('socket postgres')))
    try {
      const res = await fetch(`${crashing.base}/health`)
      const text = await res.text()

      expect(res.status).toBe(500)
      expect(JSON.parse(text)).toEqual({
        success: false,
        data: null,
        error: MESSAGES.internalError,
      })
      expect(text.includes('postgres')).toBe(false)
    } finally {
      crashing.server.close()
    }
  })
})
