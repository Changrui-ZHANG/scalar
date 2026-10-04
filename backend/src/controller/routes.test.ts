import assert from 'node:assert/strict'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { after, before, describe, it } from 'node:test'

import express from 'express'

import type { ExerciseRepository } from '../repositories/exercise.repository.ts'
import { InMemoryExerciseRepository } from '../repositories/exercise.repository.ts'
import type { LanguageRepository } from '../repositories/language.repository.ts'
import { InMemoryLanguageRepository } from '../repositories/language.repository.ts'
import { InMemoryLessonRepository } from '../repositories/lesson.repository.ts'
import { ExerciseService } from '../services/exercise.service.ts'
import { LessonService } from '../services/lesson.service.ts'
import { ExecutionController, ExerciseController, LessonController } from './index.ts'

interface Envelope {
  readonly success: boolean
  // Forme libre selon la route : verifiee par les assertions de chaque cas.
  readonly data: any
  readonly error: string | null
}

/** Monte l'API comme `index.ts`, sur un port ephemere. */
async function start(
  languages: LanguageRepository = new InMemoryLanguageRepository(),
  exercises: ExerciseRepository = new InMemoryExerciseRepository(),
): Promise<{ server: Server; base: string }> {
  const app = express()
  app.use(express.json())
  app.use('/api/v1/executions', new ExecutionController(languages).buildRouter())
  app.use(
    '/api/v1',
    new ExerciseController(new ExerciseService(languages, exercises)).buildRouter(),
  )
  app.use(
    '/api/v1',
    new LessonController(
      new LessonService(languages, new InMemoryLessonRepository(), exercises),
    ).buildRouter(),
  )
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

  before(async () => {
    ;({ server, base } = await start())
  })
  after(() => server.close())

  it('GET /languages liste les langages et leur prérequis', async () => {
    const { status, body } = await get('/languages')

    assert.equal(status, 200)
    assert.deepEqual(
      body.data.map((l: { slug: string; prerequisite: { slug: string } | null }) => [
        l.slug,
        l.prerequisite?.slug ?? null,
      ]),
      [
        ['javascript', null],
        ['typescript', 'javascript'],
      ],
    )
  })

  it('GET /languages/:language/chapters sert le parcours, ou 404', async () => {
    const ok = await get('/languages/typescript/chapters')
    assert.equal(ok.status, 200)
    assert.deepEqual(
      ok.body.data.map((c: { slug: string }) => c.slug),
      ['types-de-base', 'generiques'],
    )
    assert.deepEqual((await get('/languages/python/chapters')).body, {
      success: false,
      data: null,
      error: 'Langage inconnu.',
    })
  })

  it('GET un exercice par son chemin complet, sans solution', async () => {
    const { status, text, body } = await get(
      '/languages/typescript/chapters/generiques/exercises/dernier-ou-defaut',
    )

    assert.equal(status, 200)
    assert.equal(body.data.functionName, 'lastOr')
    assert.equal(body.data.testCases.length, 3)
    assert.deepEqual(body.data.next, { chapterSlug: 'generiques', slug: 'envelopper' })
    assert.equal(text.includes('solution'), false)
    assert.equal(text.includes('return items[items.length - 1]'), false)
  })

  it('répond 404 pour un exercice sous le mauvais chapitre ou le mauvais langage', async () => {
    assert.equal(
      (await get('/languages/typescript/chapters/types-de-base/exercises/dernier-ou-defaut'))
        .status,
      404,
    )
    assert.equal(
      (await get('/languages/javascript/chapters/generiques/exercises/dernier-ou-defaut')).status,
      404,
    )
  })

  it('GET /lessons/transverse puis /lessons/:section servent Connaissance', async () => {
    const transverse = await get('/lessons/transverse')
    assert.deepEqual(
      transverse.body.data.map((s: { slug: string }) => s.slug),
      ['conception'],
    )

    const js = await get('/lessons/javascript')
    assert.equal(js.body.data.kind, 'language')
    assert.equal(js.body.data.groups[0].slug, 'debutant')

    assert.equal((await get('/lessons/debutant')).status, 404)
  })

  it('GET /lessons/:section/:lesson sert une leçon, et masque les brouillons', async () => {
    const lesson = await get('/lessons/conception/architecture-mvc')
    assert.equal(lesson.status, 200)
    assert.equal(lesson.body.data.section.kind, 'category')

    assert.equal((await get('/lessons/javascript/modules')).status, 404)
  })

  it('GET les leçons à relire pour un chapitre', async () => {
    const { status, body } = await get('/languages/javascript/chapters/variables/lessons')

    assert.equal(status, 200)
    assert.deepEqual(
      body.data.map((l: { slug: string }) => l.slug),
      ['variables-et-types-primitifs', 'fonctions'],
    )
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

  before(async () => {
    ;({ server, base } = await start())
  })
  after(() => server.close())

  it('refuse un langage qui n’est pas proposé', async () => {
    const { status, body } = await post({ language: 'python', code: 'print(1)' })

    assert.equal(status, 400)
    assert.equal(body.error, 'Langage inconnu.')
  })

  it('applique la préparation du langage : un enum TypeScript est refusé', async () => {
    const { status, body } = await post({ language: 'typescript', code: 'enum A { X }' })

    assert.equal(status, 400)
    assert.match(body.error ?? '', /enum/)
  })
})

describe('API du contenu (panne de la source)', () => {
  let server: Server
  let base: string

  const failing: LanguageRepository = {
    listLanguages: () => Promise.reject(new Error('connexion perdue a postgres:5432')),
    findLanguageBySlug: () => Promise.reject(new Error('connexion perdue a postgres:5432')),
    findLanguageById: () => Promise.reject(new Error('connexion perdue a postgres:5432')),
  }

  before(async () => {
    ;({ server, base } = await start(failing))
  })
  after(() => server.close())

  it('répond 500 avec un message générique, sans détail interne', async () => {
    const res = await fetch(`${base}/languages/javascript/chapters`)
    const text = await res.text()

    assert.equal(res.status, 500)
    assert.equal(JSON.parse(text).success, false)
    assert.equal(text.includes('postgres'), false)
  })
})
