import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { spawnSync } from 'node:child_process'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { buildApp } from '../../../backend/src/app.ts'
import { config } from '../../../backend/src/config.ts'
import { MESSAGES } from '../../../backend/src/constants.ts'
import {
  QUESTIONNAIRE_OPTIONS,
  QUESTIONNAIRE_QUESTIONS,
} from '../../../backend/src/content/questionnaire.ts'
import { InMemoryExerciseRepository } from '../../../backend/src/repository/exercise.repository.ts'
import { InMemoryLessonRepository } from '../../../backend/src/repository/lesson.repository.ts'
import { InMemoryPlacementRepository } from '../../../backend/src/repository/placement.repository.ts'
import { InMemoryProgressRepository } from '../../../backend/src/repository/progress.repository.ts'
import type { QuestionnaireRepository } from '../../../backend/src/repository/questionnaire.repository.ts'
import { InMemoryQuestionnaireRepository } from '../../../backend/src/repository/questionnaire.repository.ts'
import { InMemoryTrackRepository } from '../../../backend/src/repository/track.repository.ts'
import { InMemoryUserRepository } from '../../../backend/src/repository/user.repository.ts'

interface Envelope {
  readonly success: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- charge utile polymorphe selon la route
  readonly data: any
  readonly error: string | null
}

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

async function start(
  questionnaire: QuestionnaireRepository = new InMemoryQuestionnaireRepository(),
) {
  const app = buildApp({
    tracks: new InMemoryTrackRepository(),
    lessons: new InMemoryLessonRepository(),
    exercises: new InMemoryExerciseRepository(),
    questionnaire,
    placements: new InMemoryPlacementRepository(),
    users: new InMemoryUserRepository(),
    progress: new InMemoryProgressRepository(),
    contentSource: 'mock',
    executionRateLimit: 1_000,
    learnerCreationRateLimit: 1_000,
    isDatabaseUp: async () => false,
  })
  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, () => resolve(s))
  })
  return { server, base: `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1` }
}

const close = (server: Server) =>
  new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()))
  })

const codeQuestions = QUESTIONNAIRE_QUESTIONS.filter((q) => q.kind === 'code')
const [easy] = codeQuestions
const knowledge = QUESTIONNAIRE_QUESTIONS.find((q) => q.kind === 'knowledge')!
const bestChoices = QUESTIONNAIRE_QUESTIONS.filter((q) =>
  ['experience', 'knowledge'].includes(q.kind),
).map((q) => ({
  questionId: q.id,
  optionId: QUESTIONNAIRE_OPTIONS.filter((o) => o.questionId === q.id).reduce((a, b) =>
    b.score > a.score ? b : a,
  ).id,
}))

describe('API du questionnaire', () => {
  let server: Server
  let base: string
  const post = async (path: string, body: unknown, learnerId?: string) => {
    const res = await realFetch(`${base}${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(learnerId === undefined ? {} : { 'x-learner-id': learnerId }),
      },
      body: JSON.stringify(body),
    })
    const text = await res.text()
    return { status: res.status, text, body: JSON.parse(text) as Envelope }
  }
  const verify = (questionId: number | string, code: string) =>
    post(`/questionnaire/exercises/${questionId}/verifications`, { code })

  beforeAll(async () => {
    ;({ server, base } = await start())
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  afterAll(() => close(server))

  it('GET /questionnaire sert les questions sans score ni solution', async () => {
    const res = await realFetch(`${base}/questionnaire`)
    const text = await res.text()
    const body = JSON.parse(text) as Envelope

    expect(res.status).toBe(200)
    expect(body.data).toHaveLength(QUESTIONNAIRE_QUESTIONS.length)
    expect(text).not.toMatch(/score|solution|isHidden/i)
  })

  it('GET /questionnaire répond 500 quand le contenu est illisible, sans détail interne', async () => {
    const failing = await start({
      listQuestions: () => Promise.reject(new Error('socket postgres')),
      listOptions: () => Promise.reject(new Error('socket postgres')),
      listTestCases: () => Promise.reject(new Error('socket postgres')),
    })
    try {
      const res = await realFetch(`${failing.base}/questionnaire`)
      const text = await res.text()

      expect(res.status).toBe(500)
      expect(JSON.parse(text).error).toBe(MESSAGES.contentUnavailable)
      expect(text).not.toMatch(/postgres/)
    } finally {
      await close(failing.server)
    }
  })

  it('vérification : valide une solution juste avec le nom de fonction du serveur', async () => {
    fakePiston(runInNode)

    const { status, body } = await verify(easy!.id, 'function ajouter(a, b) { return a + b }')

    expect(status).toBe(200)
    expect(body.data.passed).toBe(true)
  })

  it('vérification : refuse une solution fausse', async () => {
    fakePiston(runInNode)

    const { status, body } = await verify(easy!.id, 'function ajouter(a, b) { return a - b }')

    expect(status).toBe(200)
    expect(body.data.passed).toBe(false)
  })

  it('vérification : 400 sur un code vide, sans appeler le moteur', async () => {
    const engine = vi.fn(runInNode)
    fakePiston(engine)

    const { status, body } = await verify(easy!.id, '  ')

    expect(status).toBe(400)
    expect(body.error).toMatch(/vide/)
    expect(engine).not.toHaveBeenCalled()
  })

  it.each([['999'], [String(knowledge.id)], ['abc']])(
    'vérification : 404 pour la question %s',
    async (questionId) => {
      const { status, body } = await verify(questionId, 'function f() {}')

      expect(status).toBe(404)
      expect(body.error).toBe(MESSAGES.questionNotFound)
    },
  )

  it('vérification : 503 quand le moteur est en panne', async () => {
    fakePiston(() => Promise.reject(new TypeError('fetch failed: piston:2000')))

    const { status, text } = await verify(easy!.id, 'function ajouter() {}')

    expect(status).toBe(503)
    expect(JSON.parse(text).error).toBe(MESSAGES.engineUnavailable)
    expect(text).not.toMatch(/piston/)
  })

  it('résultats : recorrige chaque exercice et propose un niveau', async () => {
    const engine = vi.fn(runInNode)
    fakePiston(engine)
    const solutions: Record<string, string> = {
      ajouter: 'function ajouter(a, b) { return a + b }',
      estPalindrome: 'function estPalindrome(s) { return s === [...s].reverse().join("") }',
      factorielle: 'function factorielle(n) { return n <= 1 ? 1 : n * factorielle(n - 1) }',
    }

    const { status, body } = await post('/questionnaire/results', {
      choices: bestChoices,
      submissions: codeQuestions.map((q) => ({
        questionId: q.id,
        code: solutions[q.functionName!],
      })),
    })

    expect(status).toBe(200)
    expect(body.data).toMatchObject({
      score: 100,
      level: 'advanced',
      track: { slug: 'javascript' },
      placementId: expect.any(Number),
    })
    expect(body.data.exercises.every((e: { passed: boolean }) => e.passed)).toBe(true)
    expect(engine).toHaveBeenCalledTimes(codeQuestions.length)
  })

  it.each([
    ['un corps mal formé', { choices: 'tout juste' }, /tableau/],
    [
      'une option d’une autre question',
      { choices: [{ questionId: knowledge.id, optionId: QUESTIONNAIRE_OPTIONS[0]!.id }] },
      /n’appartient pas/,
    ],
  ])('résultats : 400 pour %s', async (_cas, payload, message) => {
    const { status, body } = await post('/questionnaire/results', payload)

    expect(status).toBe(400)
    expect(body.error).toMatch(message)
  })

  it('résultats : rattache le positionnement à l’apprenant, qui le retrouve dans sa progression', async () => {
    const learner = await realFetch(`${base}/learners`, { method: 'POST' })
    const { id } = ((await learner.json()) as Envelope).data

    const { status, body } = await post('/questionnaire/results', { choices: bestChoices }, id)
    const progress = (await (await realFetch(`${base}/learners/${id}/progress`)).json()) as Envelope

    expect(status).toBe(200)
    expect(progress.data.placement).toEqual({
      score: body.data.score,
      level: body.data.level,
      track: { slug: 'javascript', name: 'JavaScript' },
      createdAt: expect.any(String),
    })
  })

  it('résultats : 404 pour un apprenant inconnu, sans corriger les exercices', async () => {
    const engine = vi.fn(runInNode)
    fakePiston(engine)

    const { status, body } = await post(
      '/questionnaire/results',
      { submissions: [{ questionId: easy!.id, code: 'function ajouter() {}' }] },
      '00000000-0000-4000-8000-000000000000',
    )

    expect(status).toBe(404)
    expect(body.error).toBe(MESSAGES.learnerNotFound)
    expect(engine).not.toHaveBeenCalled()
  })

  it('résultats : 503 quand le moteur est en panne', async () => {
    fakePiston(() => Promise.reject(new TypeError('fetch failed: piston:2000')))

    const { status, body } = await post('/questionnaire/results', {
      submissions: [{ questionId: easy!.id, code: 'function ajouter() {}' }],
    })

    expect(status).toBe(503)
    expect(body.error).toBe(MESSAGES.engineUnavailable)
  })
})
