import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AUTH_DEPENDENCIES } from '../auth.fixtures.ts'
import { buildApp } from '../../../backend/src/app.ts'
import { MESSAGES } from '../../../backend/src/constants.ts'
import { InMemoryAdminContentRepository } from '../../../backend/src/repository/admin-content.repository.ts'
import { InMemoryCertificateRepository } from '../../../backend/src/repository/certificate.repository.ts'
import { InMemoryExerciseRepository } from '../../../backend/src/repository/exercise.repository.ts'
import { InMemoryLessonRepository } from '../../../backend/src/repository/lesson.repository.ts'
import { InMemoryPlacementRepository } from '../../../backend/src/repository/placement.repository.ts'
import { InMemoryProgressRepository } from '../../../backend/src/repository/progress.repository.ts'
import { InMemoryQuestionnaireRepository } from '../../../backend/src/repository/questionnaire.repository.ts'
import { InMemoryTrackRepository } from '../../../backend/src/repository/track.repository.ts'
import { InMemoryUserRepository } from '../../../backend/src/repository/user.repository.ts'

interface Envelope {
  readonly success: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- charge utile polymorphe selon la route
  readonly data: any
  readonly error: string | null
}

const users = new InMemoryUserRepository()
let server: Server
let base: string
let adminCookie: string
let learnerCookie: string

async function register(email: string): Promise<string> {
  const res = await fetch(`${base}/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'correct horse' }),
  })
  // « nom=valeur » seulement : les attributs du cookie ne se renvoient pas.
  return res.headers.getSetCookie()[0]!.split(';')[0]!
}

const call = (method: string, path: string, cookie?: string, body?: unknown) =>
  fetch(`${base}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(cookie ? { cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

const admin = async (method: string, path: string, body?: unknown) => {
  const res = await call(method, `/admin${path}`, adminCookie, body)
  return { status: res.status, body: res.status === 204 ? null : ((await res.json()) as Envelope) }
}

beforeAll(async () => {
  const app = buildApp({
    tracks: new InMemoryTrackRepository(),
    lessons: new InMemoryLessonRepository(),
    exercises: new InMemoryExerciseRepository(),
    questionnaire: new InMemoryQuestionnaireRepository(),
    placements: new InMemoryPlacementRepository(),
    users,
    progress: new InMemoryProgressRepository(),
    certificates: new InMemoryCertificateRepository(),
    adminContent: new InMemoryAdminContentRepository(),
    contentSource: 'mock',
    executionRateLimit: 1_000,
    learnerCreationRateLimit: 1_000,
    ...AUTH_DEPENDENCIES,
    isDatabaseUp: async () => false,
  })
  server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, () => resolve(s))
  })
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`
  adminCookie = await register('admin@example.org')
  await users.promoteToAdmin('admin@example.org')
  learnerCookie = await register('ada@example.org')
})

afterAll(
  () =>
    new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()))
    }),
)

describe('accès à /admin', () => {
  it.each([
    ['GET', '/admin/tracks'],
    ['POST', '/admin/tracks'],
    ['GET', '/admin/route-qui-n-existe-pas'],
  ])('%s %s : 401 sans session, 403 pour un apprenant', async (method, path) => {
    const anonymous = await call(method, path)
    expect(anonymous.status).toBe(401)
    expect(((await anonymous.json()) as Envelope).error).toBe(MESSAGES.unauthenticated)

    const learner = await call(method, path, learnerCookie)
    expect(learner.status).toBe(403)
    expect(((await learner.json()) as Envelope).error).toBe(MESSAGES.forbidden)
  })

  it('montre le rôle du compte connecté', async () => {
    const me = await call('GET', '/auth/me', adminCookie)

    expect(((await me.json()) as Envelope).data).toMatchObject({ role: 'admin' })
  })
})

describe('parcours', () => {
  it('liste les brouillons, que l’API publique ne sert pas', async () => {
    await admin('POST', '/tracks', { slug: 'brouillon', name: 'Brouillon', summary: 'Pas fini.' })

    const { status, body } = await admin('GET', '/tracks')
    const publicSlugs = ((await (await call('GET', '/tracks')).json()) as Envelope).data.map(
      (t: { slug: string }) => t.slug,
    )

    expect(status).toBe(200)
    expect(body!.data.map((t: { slug: string }) => t.slug)).toContain('brouillon')
    expect(publicSlugs).not.toContain('brouillon')
  })

  it('crée (201), lit, modifie puis supprime (204) un parcours', async () => {
    const created = await admin('POST', '/tracks', {
      slug: 'python',
      name: 'Python',
      summary: 'Le serpent.',
    })
    expect(created.status).toBe(201)
    expect(created.body).toMatchObject({ success: true, data: { slug: 'python', status: 'draft' } })
    const id = created.body!.data.id as number

    expect((await admin('GET', `/tracks/${id}`)).body!.data.name).toBe('Python')
    const updated = await admin('PATCH', `/tracks/${id}`, { name: 'Python 3' })
    expect(updated).toMatchObject({ status: 200, body: { data: { name: 'Python 3' } } })

    expect(await admin('DELETE', `/tracks/${id}`)).toEqual({ status: 204, body: null })
    expect((await admin('GET', `/tracks/${id}`)).status).toBe(404)
  })

  it.each([
    ['400 sur un champ invalide', 'POST', '/tracks', { slug: 'Mauvais Slug' }, 400],
    [
      '409 sur un slug déjà pris',
      'POST',
      '/tracks',
      { slug: 'javascript', name: 'JS', summary: 'x' },
      409,
    ],
    ['409 sur le slug d’un parcours publié', 'PATCH', '/tracks/1', { slug: 'js' }, 409],
    ['400 sur un prérequis inconnu', 'PATCH', '/tracks/1', { prerequisiteTrackId: 999 }, 400],
    ['409 sur la suppression d’un parcours publié', 'DELETE', '/tracks/1', undefined, 409],
    ['404 sur un id inconnu', 'PATCH', '/tracks/999', { name: 'X' }, 404],
    ['404 sur un id mal formé', 'GET', '/tracks/abc', undefined, 404],
    ['404 sur un id hors des entiers PostgreSQL', 'GET', '/tracks/99999999999', undefined, 404],
  ])('%s', async (_name, method, path, body, expected) => {
    const res = await admin(method, path, body)

    expect(res.status).toBe(expected)
    expect(res.body).toMatchObject({ success: false, data: null, error: expect.any(String) })
  })
})

describe('chapitres', () => {
  it('liste ceux d’un parcours, 404 pour un parcours inconnu', async () => {
    expect((await admin('GET', '/tracks/1/chapters')).body!.data.length).toBeGreaterThan(0)
    expect(await admin('GET', '/tracks/999/chapters')).toMatchObject({
      status: 404,
      body: { error: MESSAGES.trackNotFound },
    })
  })

  it('crée, déplace de niveau, publie puis refuse de supprimer un chapitre', async () => {
    const created = await admin('POST', '/tracks/1/chapters', {
      slug: 'nouveau-chapitre',
      level: 'beginner',
      title: 'Nouveau',
      summary: 'Un chapitre neuf.',
    })
    expect(created).toMatchObject({ status: 201, body: { data: { status: 'draft', trackId: 1 } } })
    const path = `/tracks/1/chapters/${created.body!.data.id}`

    const moved = await admin('PATCH', path, { level: 'ecosystem', status: 'published' })
    expect(moved.body!.data).toMatchObject({ level: 'ecosystem', status: 'published' })
    expect(moved.body!.data.firstPublishedAt).toEqual(expect.any(String))

    expect(await admin('DELETE', path)).toMatchObject({
      status: 409,
      body: { error: MESSAGES.publishedNotDeletable },
    })
  })

  it('404 pour un chapitre demandé sous un autre parcours que le sien', async () => {
    const [first] = (await admin('GET', '/tracks/1/chapters')).body!.data
    const otherTrack = (await admin('GET', '/tracks')).body!.data.find(
      (t: { id: number }) => t.id !== 1,
    )

    expect(await admin('GET', `/tracks/${otherTrack.id}/chapters/${first.id}`)).toMatchObject({
      status: 404,
      body: { error: MESSAGES.chapterNotFound },
    })
  })
})
