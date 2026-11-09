import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { spawnSync } from 'node:child_process'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { AUTH_DEPENDENCIES } from '../auth.fixtures.ts'
import { buildApp } from '../../../backend/src/app.ts'
import { config } from '../../../backend/src/config.ts'
import { MAX_CODE_BYTES, MESSAGES } from '../../../backend/src/constants.ts'
import { InMemoryAdminContentRepository } from '../../../backend/src/repository/admin-content.repository.ts'
import { InMemoryCertificateRepository } from '../../../backend/src/repository/certificate.repository.ts'
import { InMemoryExerciseRepository } from '../../../backend/src/repository/exercise.repository.ts'
import { InMemoryLessonRepository } from '../../../backend/src/repository/lesson.repository.ts'
import { InMemoryPlacementRepository } from '../../../backend/src/repository/placement.repository.ts'
import { InMemoryProgressRepository } from '../../../backend/src/repository/progress.repository.ts'
import { InMemoryQuestionnaireRepository } from '../../../backend/src/repository/questionnaire.repository.ts'
import type { TrackRepository } from '../../../backend/src/repository/track.repository.ts'
import { InMemoryTrackRepository } from '../../../backend/src/repository/track.repository.ts'
import { InMemoryUserRepository } from '../../../backend/src/repository/user.repository.ts'

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
    placements: new InMemoryPlacementRepository(),
    users: new InMemoryUserRepository(),
    progress: new InMemoryProgressRepository(),
    certificates: new InMemoryCertificateRepository(),
    adminContent: new InMemoryAdminContentRepository(),
    contentSource: 'mock',
    executionRateLimit: 1_000,
    learnerCreationRateLimit: 1_000,
    ...AUTH_DEPENDENCIES,
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
    expect(
      (await get('/tracks/typescript/chapters/types-de-base/exercises/dernier-ou-defaut')).status,
    ).toBe(404)
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

describe('progression de l’apprenant anonyme', () => {
  let server: Server
  let base: string
  const IS_EVEN = '/tracks/javascript/chapters/conditions/exercises/est-pair'
  const RIGHT = 'function isEven(n) { return n % 2 === 0 }'
  const WRONG = 'function isEven(n) { return true }'
  const createLearner = async (): Promise<string> => {
    const res = await realFetch(`${base}/learners`, { method: 'POST' })
    expect(res.status).toBe(201)
    return ((await res.json()) as Envelope).data.id
  }
  const verify = (code: string, learnerId?: string) =>
    realFetch(`${base}${IS_EVEN}/verifications`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(learnerId === undefined ? {} : { 'x-learner-id': learnerId }),
      },
      body: JSON.stringify({ code }),
    })
  const progressOf = async (learnerId: string) => {
    const res = await realFetch(`${base}/learners/${learnerId}/progress`)
    return { status: res.status, body: (await res.json()) as Envelope }
  }

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

  it('crée un apprenant sans compte, à la progression vide', async () => {
    const id = await createLearner()

    expect(id).toMatch(/^[0-9a-f-]{36}$/)
    expect((await progressOf(id)).body.data).toEqual({
      placement: null,
      passedCount: 0,
      exercises: [],
      certificates: [],
    })
  })

  it('enregistre chaque vérification envoyée avec son identifiant, et garde la première réussite', async () => {
    fakePiston(runInNode)
    const id = await createLearner()

    await verify(WRONG, id)
    await verify(RIGHT, id)
    await verify(WRONG, id)
    await verify(RIGHT)

    const { status, body } = await progressOf(id)
    expect(status).toBe(200)
    expect(body.data.passedCount).toBe(1)
    expect(body.data.exercises).toEqual([
      {
        track: 'javascript',
        chapter: 'conditions',
        exercise: 'est-pair',
        title: 'Pair ou impair',
        attempts: 3,
        passed: true,
        firstPassedAt: expect.any(String),
        lastAttemptAt: expect.any(String),
      },
    ])
    expect(body.data.exercises[0].firstPassedAt < body.data.exercises[0].lastAttemptAt).toBe(true)
  })

  it('certificat : refuse une demande invalide, un inconnu ou un parcours pas terminé', async () => {
    const id = await createLearner()
    const ask = async (learnerId: string, body: unknown) => {
      const res = await realFetch(`${base}/learners/${learnerId}/certificates`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      return { status: res.status, error: ((await res.json()) as Envelope).error }
    }
    const valid = { track: 'javascript', holderName: 'Ada' }

    expect(await ask(id, { track: 'javascript', holderName: '   ' })).toEqual({
      status: 400,
      error: 'Le nom affiché sur le certificat est vide.',
    })
    expect(await ask('pas-un-uuid', valid)).toEqual({
      status: 404,
      error: MESSAGES.learnerNotFound,
    })
    expect(await ask(id, { ...valid, track: 'python' })).toEqual({
      status: 404,
      error: MESSAGES.trackNotFound,
    })
    expect(await ask(id, valid)).toEqual({ status: 403, error: MESSAGES.trackNotCompleted })

    const unknown = await realFetch(`${base}/certificates/AAAAA-AAAAA`)
    expect(unknown.status).toBe(404)
    expect(((await unknown.json()) as Envelope).error).toBe(MESSAGES.certificateNotFound)
  })

  it('refuse en 404 un identifiant inconnu ou mal formé, sans appeler le moteur', async () => {
    const engine = vi.fn(runInNode)
    fakePiston(engine)

    for (const id of ['00000000-0000-4000-8000-000000000000', 'pas-un-uuid']) {
      const res = await verify(RIGHT, id)
      expect(res.status, id).toBe(404)
      expect(((await res.json()) as Envelope).error).toBe(MESSAGES.learnerNotFound)
      expect((await progressOf(id)).status, id).toBe(404)
    }
    expect(engine).not.toHaveBeenCalled()
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

  it('répond 404 en JSON sur une route inconnue, y compris les anciennes routes', async () => {
    for (const path of [
      '/nulle-part',
      '/languages',
      '/lessons/javascript',
      '/tracks/javascript/chapters',
      '/tracks/javascript/chapters/boucles/lessons',
    ]) {
      const res = await fetch(`${base}${path}`)

      expect(res.status, path).toBe(404)
      expect(((await res.json()) as Envelope).error).toBe(MESSAGES.routeNotFound)
    }
  })

  it('envoie les en-têtes de sécurité et n’annonce pas Express', async () => {
    const res = await fetch(`${base}/tracks`)

    expect(res.headers.get('x-powered-by')).toBeNull()
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('content-security-policy')).toMatch(/frame-ancestors 'self'/)
    expect(res.headers.get('strict-transport-security')).toMatch(/max-age=\d+/)
    expect(res.headers.get('referrer-policy')).toBe('no-referrer')
  })

  it('répond à la racine, et expose la source du contenu et l’état de la base sur /health', async () => {
    expect(await (await fetch(base)).json()).toEqual({
      status: 'ok',
      message: 'API Scalar (Backend)',
    })
    const res = await fetch(`${base}/health`)
    expect(await res.json()).toEqual({ status: 'ok', content: 'mock', database: 'disconnected' })

    const up = await start(undefined, async () => true)
    try {
      const health = (await (await fetch(`${up.base}/health`)).json()) as { database: string }
      expect(health.database).toBe('connected')
    } finally {
      up.server.close()
    }
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

describe('compte : inscription, connexion, accès protégé', () => {
  let server: Server
  let base: string
  const IS_EVEN = '/tracks/javascript/chapters/conditions/exercises/est-pair'
  const RIGHT = 'function isEven(n) { return n % 2 === 0 }'
  const PASSWORD = 'correct horse'
  let emails = 0
  const freshEmail = () => `apprenant${++emails}@example.org`

  const call = async (
    method: string,
    path: string,
    options: { body?: unknown; cookie?: string; learnerId?: string } = {},
  ) => {
    const res = await realFetch(`${base}${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        ...(options.cookie === undefined ? {} : { cookie: options.cookie }),
        ...(options.learnerId === undefined ? {} : { 'x-learner-id': options.learnerId }),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
    // Le navigateur renverrait ce cookie tout seul ; ici on garde « nom=valeur » pour le recopier.
    const cookie = res.headers.getSetCookie()[0]?.split(';')[0]
    return { status: res.status, body: (await res.json()) as Envelope, cookie, res }
  }
  const register = (email = freshEmail(), learnerId?: string) =>
    call('POST', '/auth/register', { body: { email, password: PASSWORD }, learnerId })

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

  it('inscrit, pose un cookie HttpOnly SameSite=Strict, sans jamais renvoyer le hash', async () => {
    const email = freshEmail()
    const { status, body, res } = await register(email)

    expect(status).toBe(201)
    expect(body.data).toEqual({
      id: expect.any(String),
      email,
      role: 'learner',
      createdAt: expect.any(String),
    })
    expect(JSON.stringify(body)).not.toContain('hash')
    const setCookie = res.headers.getSetCookie()[0]
    expect(setCookie).toMatch(/^scalar_session=[^;]+;/)
    expect(setCookie).toMatch(/HttpOnly/)
    expect(setCookie).toMatch(/SameSite=Strict/)
  })

  it('refuse en 400 des identifiants invalides, en 409 un email déjà pris', async () => {
    const email = freshEmail()
    await register(email)

    const invalid = await call('POST', '/auth/register', {
      body: { email: 'ada', password: PASSWORD },
    })
    const short = await call('POST', '/auth/register', { body: { email, password: '1234' } })
    const taken = await register(email.toUpperCase())

    expect(invalid).toMatchObject({ status: 400, body: { error: MESSAGES.invalidEmail } })
    expect(short).toMatchObject({ status: 400, body: { error: MESSAGES.invalidPassword } })
    expect(taken).toMatchObject({ status: 409, body: { error: MESSAGES.emailTaken } })
  })

  it('répond 401 à la connexion pour un mot de passe court : il est juste faux', async () => {
    const email = freshEmail()
    await register(email)

    const short = await call('POST', '/auth/login', { body: { email, password: '1234' } })

    expect(short).toMatchObject({ status: 401, body: { error: MESSAGES.invalidCredentials } })
  })

  it('répond 401 à la connexion pour un identifiant inconnu qui n’est pas un email', async () => {
    const unknown = await call('POST', '/auth/login', {
      body: { email: 'inconnu', password: 'test' },
    })

    expect(unknown).toMatchObject({ status: 401, body: { error: MESSAGES.invalidCredentials } })
  })

  it('connecte, puis /auth/me renvoie le compte de la session', async () => {
    const email = freshEmail()
    const registered = await register(email)

    const login = await call('POST', '/auth/login', { body: { email, password: PASSWORD } })
    const me = await call('GET', '/auth/me', { cookie: login.cookie })

    expect(login.status).toBe(200)
    expect(me.status).toBe(200)
    expect(me.body.data).toEqual(registered.body.data)
    expect((await call('GET', '/auth/me')).status).toBe(401)
  })

  it('refuse en 401 un mauvais mot de passe, avec le même message qu’un email inconnu', async () => {
    const email = freshEmail()
    await register(email)

    const wrong = await call('POST', '/auth/login', { body: { email, password: 'mauvais mdp' } })
    const unknown = await call('POST', '/auth/login', {
      body: { email: 'personne@example.org', password: PASSWORD },
    })

    expect(wrong).toMatchObject({ status: 401, body: { error: MESSAGES.invalidCredentials } })
    expect(unknown).toMatchObject({ status: 401, body: { error: MESSAGES.invalidCredentials } })
    expect(wrong.cookie).toBeUndefined()
  })

  it('la déconnexion efface le cookie et révoque le jeton, même recopié ailleurs', async () => {
    const { cookie } = await register()

    const logout = await call('POST', '/auth/logout', { cookie })

    expect(logout.status).toBe(200)
    expect(logout.res.headers.getSetCookie()[0]).toMatch(/^scalar_session=;/)
    expect((await call('GET', '/auth/me', { cookie })).status).toBe(401)
    expect((await call('POST', '/auth/logout')).status).toBe(200)
  })

  it('reprend l’apprenant anonyme : même id, progression conservée', async () => {
    fakePiston(runInNode)
    const id = (await call('POST', '/learners')).body.data.id as string
    await call('POST', `${IS_EVEN}/verifications`, { body: { code: RIGHT }, learnerId: id })

    const { status, body, cookie } = await register(freshEmail(), id)
    const progress = await call('GET', `/learners/${id}/progress`, { cookie })

    expect(status).toBe(201)
    expect(body.data.id).toBe(id)
    expect(progress.status).toBe(200)
    expect(progress.body.data.passedCount).toBe(1)
  })

  it('refuse la reprise d’un apprenant inconnu (404) ou déjà inscrit (409)', async () => {
    const { body } = await register()

    const unknown = await register(freshEmail(), '00000000-0000-4000-8000-000000000000')
    const again = await register(freshEmail(), body.data.id)

    expect(unknown).toMatchObject({ status: 404, body: { error: MESSAGES.learnerNotFound } })
    expect(again).toMatchObject({
      status: 409,
      body: { error: MESSAGES.learnerAlreadyRegistered },
    })
  })

  it('protège les routes d’un compte inscrit : 401 sans session, 403 avec celle d’un autre', async () => {
    const engine = vi.fn(runInNode)
    fakePiston(engine)
    const ada = await register()
    const eve = await register()
    const id = ada.body.data.id as string
    const certificate = { track: 'javascript', holderName: 'Ada' }

    for (const [cookie, status, error] of [
      [undefined, 401, MESSAGES.unauthenticated],
      [eve.cookie, 403, MESSAGES.forbidden],
    ] as const) {
      const attempts = [
        await call('GET', `/learners/${id}/progress`, { cookie }),
        await call('POST', `/learners/${id}/certificates`, { body: certificate, cookie }),
        await call('POST', `${IS_EVEN}/verifications`, {
          body: { code: RIGHT },
          cookie,
          learnerId: id,
        }),
        await call('POST', '/questionnaire/results', { body: {}, cookie, learnerId: id }),
      ]
      for (const attempt of attempts) {
        expect(attempt).toMatchObject({ status, body: { error } })
      }
    }
    expect(engine).not.toHaveBeenCalled()
    expect((await call('GET', `/learners/${id}/progress`, { cookie: ada.cookie })).status).toBe(200)
  })

  it('enregistre la vérification d’un compte connecté sans X-Learner-Id', async () => {
    fakePiston(runInNode)
    const { body, cookie } = await register()

    await call('POST', `${IS_EVEN}/verifications`, { body: { code: RIGHT }, cookie })
    const progress = await call('GET', `/learners/${body.data.id}/progress`, { cookie })

    expect(progress.body.data.passedCount).toBe(1)
  })

  it('laisse un apprenant anonyme accessible par son seul identifiant', async () => {
    const id = (await call('POST', '/learners')).body.data.id as string

    expect((await call('GET', `/learners/${id}/progress`)).status).toBe(200)
  })
})
