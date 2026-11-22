import { createServer } from 'node:http'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { spawnSync } from 'node:child_process'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import WebSocket from 'ws'

import { AUTH_DEPENDENCIES } from '../../../../fixtures/backend/auth.fixtures.ts'
import { subscription } from '../../../../fixtures/backend/premium.fixtures.ts'
import { buildServer } from '../../../../../backend/src/app.ts'
import { config } from '../../../../../backend/src/config.ts'
import { MESSAGES } from '../../../../../backend/src/constants.ts'
import { InMemoryAdminContentRepository } from '../../../../../backend/src/repository/admin-content.repository.ts'
import { InMemoryCertificateRepository } from '../../../../../backend/src/repository/certificate.repository.ts'
import { InMemoryExerciseRepository } from '../../../../../backend/src/repository/exercise.repository.ts'
import { InMemoryLessonRepository } from '../../../../../backend/src/repository/lesson.repository.ts'
import { InMemoryPlacementRepository } from '../../../../../backend/src/repository/placement.repository.ts'
import { InMemoryProgressRepository } from '../../../../../backend/src/repository/progress.repository.ts'
import { InMemoryQuestionnaireRepository } from '../../../../../backend/src/repository/questionnaire.repository.ts'
import { InMemorySubscriptionRepository } from '../../../../../backend/src/repository/subscription.repository.ts'
import { InMemoryTrackRepository } from '../../../../../backend/src/repository/track.repository.ts'
import { InMemoryUserRepository } from '../../../../../backend/src/repository/user.repository.ts'

// Chapitre 2 (gratuit) et chapitre 3 (Premium) du parcours JavaScript.
const FREE = { track: 'javascript', chapter: 'variables', exercise: 'aire-rectangle' }
const LOCKED = { track: 'javascript', chapter: 'conditions', exercise: 'est-pair' }
const RIGHT = 'function area(width, height) { return width * height }'
const WRONG = 'function area(width, height) { return width + height }'
const PASSWORD = 'mot de passe solide'
const realFetch = globalThis.fetch

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- messages polymorphes selon leur type
type Message = Record<string, any>

/** Piston simule par un vrai processus Node ; `delayMs` laisse le temps d'envoyer autre chose. */
function fakePiston(delayMs = 0) {
  const engine = vi.fn(async (code: string) => {
    await new Promise((resolve) => setTimeout(resolve, delayMs))
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
  })
  vi.spyOn(globalThis, 'fetch').mockImplementation((url, init) =>
    String(url).startsWith(config.PISTON_URL)
      ? engine(JSON.parse(String(init?.body)).files[0].content as string)
      : realFetch(url, init),
  )
  return engine
}

describe('verdict en temps réel par WebSocket', () => {
  let server: Server
  let base: string
  let wsBase: string
  const users = new InMemoryUserRepository()
  const subscriptions = new InMemorySubscriptionRepository()
  const progress = new InMemoryProgressRepository()
  const opened: WebSocket[] = []
  let counter = 0

  const open = async (cookie?: string, path = '/api/v1/ws'): Promise<WebSocket> => {
    const socket = new WebSocket(`${wsBase}${path}`, cookie ? { headers: { cookie } } : {})
    opened.push(socket)
    await new Promise<void>((resolve, reject) => {
      socket.once('open', () => resolve())
      socket.once('error', reject)
    })
    return socket
  }
  /** Jusqu'au verdict ou a la premiere erreur, messages compris. */
  const verdictOf = (socket: WebSocket, message: unknown): Promise<Message[]> =>
    new Promise((resolve) => {
      const received: Message[] = []
      const onMessage = (data: WebSocket.RawData) => {
        const parsed = JSON.parse(String(data)) as Message
        received.push(parsed)
        if (parsed.type === 'verdict' || parsed.type === 'error') {
          socket.off('message', onMessage)
          resolve(received)
        }
      }
      socket.on('message', onMessage)
      socket.send(typeof message === 'string' ? message : JSON.stringify(message))
    })
  const register = async () => {
    counter += 1
    const res = await realFetch(`${base}/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: `ws-${counter}@example.com`, password: PASSWORD }),
    })
    const id = ((await res.json()) as Message).data.id as string
    return { id, cookie: res.headers.getSetCookie()[0]!.split(';')[0]! }
  }
  const createLearner = async (): Promise<string> =>
    ((await (await realFetch(`${base}/learners`, { method: 'POST' })).json()) as Message).data.id

  beforeAll(async () => {
    const { app, upgrade } = buildServer({
      tracks: new InMemoryTrackRepository(),
      lessons: new InMemoryLessonRepository(),
      exercises: new InMemoryExerciseRepository(),
      questionnaire: new InMemoryQuestionnaireRepository(),
      placements: new InMemoryPlacementRepository(),
      users,
      progress,
      certificates: new InMemoryCertificateRepository(),
      adminContent: new InMemoryAdminContentRepository(),
      subscriptions,
      freeChapters: 2,
      contentSource: 'mock',
      executionRateLimit: 1_000,
      learnerCreationRateLimit: 1_000,
      ...AUTH_DEPENDENCIES,
      isDatabaseUp: async () => false,
    })
    server = createServer(app)
    server.on('upgrade', upgrade)
    await new Promise<void>((resolve) => server.listen(0, () => resolve()))
    const { port } = server.address() as AddressInfo
    base = `http://127.0.0.1:${port}/api/v1`
    wsBase = `ws://127.0.0.1:${port}`
  })
  afterEach(() => {
    vi.restoreAllMocks()
    for (const socket of opened.splice(0)) {
      socket.terminate()
    }
  })
  afterAll(
    () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()))
      }),
  )

  it('envoie les étapes dans l’ordre : reçu, exécution, chaque vérification, verdict', async () => {
    const engine = fakePiston()
    const socket = await open()

    const messages = await verdictOf(socket, { type: 'verify', ...FREE, code: RIGHT })
    const verdict = messages.at(-1)!

    expect(messages.map((m) => m.type)).toEqual([
      'received',
      'running',
      ...verdict.result.checks.map(() => 'check'),
      'verdict',
    ])
    expect(messages.filter((m) => m.type === 'check')).toEqual(
      verdict.result.checks.map((check: unknown, index: number) => ({
        type: 'check',
        index,
        total: verdict.result.checks.length,
        check,
      })),
    )
    expect(verdict.result).toMatchObject({ passed: true, passedCount: 5, total: 5 })
    expect(engine).toHaveBeenCalledTimes(1)
  })

  it('donne le même verdict que la route HTTP, qui reste le repli', async () => {
    fakePiston()
    const socket = await open()

    const live = (await verdictOf(socket, { type: 'verify', ...FREE, code: WRONG })).at(-1)!
    const http = await realFetch(
      `${base}/tracks/${FREE.track}/chapters/${FREE.chapter}/exercises/${FREE.exercise}/verifications`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: WRONG }),
      },
    )
    const { data } = (await http.json()) as Message

    expect(live.result.passed).toBe(false)
    expect({ ...live.result, execution: undefined }).toEqual({ ...data, execution: undefined })
  })

  it('enregistre la tentative de l’apprenant nommé dans le message', async () => {
    fakePiston()
    const learnerId = await createLearner()
    const socket = await open()

    await verdictOf(socket, { type: 'verify', ...FREE, code: WRONG, learnerId })
    await verdictOf(socket, { type: 'verify', ...FREE, code: RIGHT, learnerId })

    const saved = await progress.listProgress(learnerId)
    expect(saved).toHaveLength(1)
    expect(saved[0]).toMatchObject({ attempts: 2, firstPassedAt: expect.any(Date) })
  })

  it('enregistre pour le compte de la session, sans identifiant dans le message', async () => {
    fakePiston()
    const { id, cookie } = await register()
    const socket = await open(cookie)

    await verdictOf(socket, { type: 'verify', ...FREE, code: RIGHT })

    expect(await progress.listProgress(id)).toHaveLength(1)
  })

  it('applique les règles d’accès de la route HTTP à l’apprenant nommé', async () => {
    const engine = fakePiston()
    const ada = await register()
    const eve = await register()

    const unknown = await verdictOf(await open(), {
      type: 'verify',
      ...FREE,
      code: RIGHT,
      learnerId: '00000000-0000-4000-8000-000000000000',
    })
    const noSession = await verdictOf(await open(), {
      type: 'verify',
      ...FREE,
      code: RIGHT,
      learnerId: ada.id,
    })
    const otherSession = await verdictOf(await open(eve.cookie), {
      type: 'verify',
      ...FREE,
      code: RIGHT,
      learnerId: ada.id,
    })

    expect(unknown).toEqual([{ type: 'error', status: 404, error: MESSAGES.learnerNotFound }])
    expect(noSession).toEqual([{ type: 'error', status: 401, error: MESSAGES.unauthenticated }])
    expect(otherSession).toEqual([{ type: 'error', status: 403, error: MESSAGES.forbidden }])
    expect(engine).not.toHaveBeenCalled()
  })

  it('refuse un chapitre Premium sans abonnement, sans appeler le moteur ; l’ouvre à un abonné', async () => {
    const engine = fakePiston()
    const anonymous = await verdictOf(await open(), {
      type: 'verify',
      ...LOCKED,
      code: 'function isEven(n) { return n % 2 === 0 }',
    })
    expect(anonymous).toEqual([{ type: 'error', status: 403, error: MESSAGES.premiumRequired }])
    expect(engine).not.toHaveBeenCalled()

    const premium = await register()
    await subscriptions.save(subscription(premium.id))
    const unlocked = await verdictOf(await open(premium.cookie), {
      type: 'verify',
      ...LOCKED,
      code: 'function isEven(n) { return n % 2 === 0 }',
    })
    expect(unlocked.at(-1)).toMatchObject({ type: 'verdict', result: { passed: true } })
  })

  it('répond par une erreur à un message illisible, sans fermer la connexion', async () => {
    fakePiston()
    const socket = await open()

    expect(await verdictOf(socket, 'pas du json')).toEqual([
      { type: 'error', status: 400, error: MESSAGES.invalidRequest },
    ])
    expect(await verdictOf(socket, { type: 'autre' })).toEqual([
      { type: 'error', status: 400, error: MESSAGES.invalidRequest },
    ])
    expect((await verdictOf(socket, { type: 'verify', ...FREE }))[0]).toMatchObject({
      type: 'error',
      status: 400,
    })
    expect((await verdictOf(socket, { type: 'verify', ...FREE, code: RIGHT })).at(-1)?.type).toBe(
      'verdict',
    )
  })

  it('répond 404 pour un exercice introuvable, avant toute exécution', async () => {
    const engine = fakePiston()
    const messages = await verdictOf(await open(), {
      type: 'verify',
      ...FREE,
      exercise: 'inconnu',
      code: RIGHT,
    })

    expect(messages).toEqual([
      { type: 'received' },
      { type: 'error', status: 404, error: MESSAGES.exerciseNotFound },
    ])
    expect(engine).not.toHaveBeenCalled()
  })

  it('répond 503 quand le moteur est en panne, sans détail interne', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((url, init) =>
      String(url).startsWith(config.PISTON_URL)
        ? Promise.reject(new Error('connexion refusée par piston:2000'))
        : realFetch(url, init),
    )
    const messages = await verdictOf(await open(), { type: 'verify', ...FREE, code: RIGHT })

    expect(messages).toEqual([
      { type: 'received' },
      { type: 'running' },
      { type: 'error', status: 503, error: MESSAGES.engineUnavailable },
    ])
  })

  it('refuse une deuxième vérification tant que la première tourne', async () => {
    const engine = fakePiston(300)
    const socket = await open()
    const all: Message[] = []
    const done = new Promise<void>((resolve) => {
      socket.on('message', (data) => {
        all.push(JSON.parse(String(data)) as Message)
        if (all.at(-1)?.type === 'verdict') resolve()
      })
    })

    socket.send(JSON.stringify({ type: 'verify', ...FREE, code: RIGHT }))
    await new Promise((resolve) => setTimeout(resolve, 50))
    socket.send(JSON.stringify({ type: 'verify', ...FREE, code: WRONG }))
    await done

    expect(all.filter((m) => m.type === 'error')).toEqual([
      { type: 'error', status: 409, error: MESSAGES.verificationInProgress },
    ])
    expect(all.at(-1)).toMatchObject({ type: 'verdict', result: { passed: true } })
    expect(engine).toHaveBeenCalledTimes(1)
  })

  it('refuse la poignée de main hors de /api/v1/ws', async () => {
    await expect(open(undefined, '/api/v1/autre')).rejects.toThrow()
  })
})

describe('verdict en temps réel : limite de débit', () => {
  it('compte chaque vérification dans la limite des exécutions, puis répond 429', async () => {
    fakePiston()
    const { app, upgrade } = buildServer({
      tracks: new InMemoryTrackRepository(),
      lessons: new InMemoryLessonRepository(),
      exercises: new InMemoryExerciseRepository(),
      questionnaire: new InMemoryQuestionnaireRepository(),
      placements: new InMemoryPlacementRepository(),
      users: new InMemoryUserRepository(),
      progress: new InMemoryProgressRepository(),
      certificates: new InMemoryCertificateRepository(),
      adminContent: new InMemoryAdminContentRepository(),
      subscriptions: new InMemorySubscriptionRepository(),
      freeChapters: 2,
      contentSource: 'mock',
      executionRateLimit: 2,
      learnerCreationRateLimit: 1_000,
      ...AUTH_DEPENDENCIES,
      isDatabaseUp: async () => false,
    })
    const server = createServer(app)
    server.on('upgrade', upgrade)
    await new Promise<void>((resolve) => server.listen(0, () => resolve()))
    const socket = new WebSocket(
      `ws://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/ws`,
    )
    await new Promise((resolve) => socket.once('open', resolve))
    const ask = () =>
      new Promise<Message>((resolve) => {
        const onMessage = (data: WebSocket.RawData) => {
          const parsed = JSON.parse(String(data)) as Message
          if (parsed.type === 'verdict' || parsed.type === 'error') {
            socket.off('message', onMessage)
            resolve(parsed)
          }
        }
        socket.on('message', onMessage)
        socket.send(JSON.stringify({ type: 'verify', ...FREE, code: RIGHT }))
      })

    try {
      expect((await ask()).type).toBe('verdict')
      expect((await ask()).type).toBe('verdict')
      expect(await ask()).toEqual({ type: 'error', status: 429, error: MESSAGES.tooManyExecutions })
    } finally {
      socket.terminate()
      vi.restoreAllMocks()
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
  })
})
