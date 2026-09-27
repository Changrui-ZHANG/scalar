import assert from 'node:assert/strict'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { after, before, describe, it } from 'node:test'

import express from 'express'

import { InMemoryExerciseRepository } from '../repositories/exercise.repository.ts'
import type { ExerciseRepository } from '../repositories/exercise.repository.ts'
import { ExerciseService } from '../services/exercise.service.ts'
import { ExerciseController } from './exercise.controller.ts'

interface Envelope {
  readonly success: boolean
  // Forme libre selon la route : verifiee par les assertions de chaque cas.
  readonly data: any
  readonly error: string | null
}

/** Monte le routeur sur un port ephemere et renvoie son URL de base. */
async function start(repository: ExerciseRepository): Promise<{ server: Server; base: string }> {
  const app = express()
  app.use('/api/v1', new ExerciseController(new ExerciseService(repository)).buildRouter())
  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, () => resolve(s))
  })
  const { port } = server.address() as AddressInfo
  return { server, base: `http://127.0.0.1:${port}/api/v1` }
}

describe('ExerciseController (données fictives)', () => {
  let server: Server
  let base: string

  before(async () => {
    ;({ server, base } = await start(new InMemoryExerciseRepository()))
  })
  after(() => server.close())

  it('GET /languages/javascript/chapters liste le parcours', async () => {
    const res = await fetch(`${base}/languages/javascript/chapters`)
    const body = (await res.json()) as Envelope

    assert.equal(res.status, 200)
    assert.equal(body.success, true)
    assert.deepEqual(
      body.data.map((c: { slug: string }) => c.slug),
      ['variables', 'conditions', 'boucles'],
    )
  })

  it('GET /languages/:language/chapters refuse un langage inconnu en 404', async () => {
    const res = await fetch(`${base}/languages/python/chapters`)
    const body = (await res.json()) as Envelope

    assert.equal(res.status, 404)
    assert.deepEqual(body, { success: false, data: null, error: 'Langage inconnu.' })
  })

  it('GET /chapters/:slug renvoie le rappel de cours', async () => {
    const res = await fetch(`${base}/chapters/variables`)
    const body = (await res.json()) as Envelope

    assert.equal(res.status, 200)
    assert.match(body.data.lesson, /const/)
    assert.equal(body.data.exercises.length, 2)
  })

  it('GET /chapters/:slug répond 404 pour un chapitre inconnu', async () => {
    const res = await fetch(`${base}/chapters/inconnu`)
    assert.equal(res.status, 404)
  })

  it('GET /exercises/:slug renvoie l’exercice sans sa solution', async () => {
    const res = await fetch(`${base}/exercises/echanger-valeurs`)
    const text = await res.text()
    const body = JSON.parse(text)

    assert.equal(res.status, 200)
    assert.equal(body.data.functionName, 'swap')
    assert.deepEqual(body.data.next, { slug: 'aire-rectangle', chapterSlug: 'variables' })
    assert.equal(text.includes('"solution"'), false)
    assert.equal(text.includes('return [b, a]'), false)
  })

  it('GET /exercises/:slug répond 404 pour un exercice inconnu', async () => {
    const res = await fetch(`${base}/exercises/inconnu`)
    assert.equal(res.status, 404)
  })
})

describe('ExerciseController (panne de la source)', () => {
  let server: Server
  let base: string

  const failing: ExerciseRepository = {
    listChapters: () => Promise.reject(new Error('connexion perdue a postgres:5432')),
    listExercises: () => Promise.reject(new Error('connexion perdue')),
    findChapterBySlug: () => Promise.reject(new Error('connexion perdue')),
    findExerciseBySlug: () => Promise.reject(new Error('connexion perdue')),
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
