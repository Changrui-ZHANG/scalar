import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import express from 'express'
import type { Express } from 'express'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AUTH_DEPENDENCIES } from '../auth.fixtures.ts'
import { buildApp } from '../../../backend/src/app.ts'
import { loadOpenApiSpec } from '../../../backend/src/http/api-docs.ts'
import { InMemoryAdminContentRepository } from '../../../backend/src/repository/admin-content.repository.ts'
import { InMemoryCertificateRepository } from '../../../backend/src/repository/certificate.repository.ts'
import { InMemoryExerciseRepository } from '../../../backend/src/repository/exercise.repository.ts'
import { InMemoryLessonRepository } from '../../../backend/src/repository/lesson.repository.ts'
import { InMemoryPlacementRepository } from '../../../backend/src/repository/placement.repository.ts'
import { InMemoryProgressRepository } from '../../../backend/src/repository/progress.repository.ts'
import { InMemoryQuestionnaireRepository } from '../../../backend/src/repository/questionnaire.repository.ts'
import { InMemoryTrackRepository } from '../../../backend/src/repository/track.repository.ts'
import { InMemoryUserRepository } from '../../../backend/src/repository/user.repository.ts'

const API_PREFIX = '/api/v1'
const DOCS_PREFIX = `${API_PREFIX}/docs`
const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const

interface RouteLayer {
  readonly handle: unknown
  readonly route?: { readonly path: string | string[]; readonly methods: Record<string, boolean> }
}

const build = (apiDocs?: boolean): Express =>
  buildApp({
    tracks: new InMemoryTrackRepository(),
    lessons: new InMemoryLessonRepository(),
    exercises: new InMemoryExerciseRepository(),
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
    isDatabaseUp: async () => false,
    apiDocs,
  })

// Express 5 ne garde pas le chemin de montage d'un routeur : on le note au moment du `use`.
function expressOperations(): Set<string> {
  const mountedAt = new Map<unknown, string>()
  const use = express.Router.prototype.use
  const spy = vi.spyOn(express.Router.prototype, 'use').mockImplementation(function (
    this: unknown,
    ...args: unknown[]
  ) {
    const [path, ...handlers] = args
    if (typeof path === 'string') {
      for (const handler of handlers.flat()) mountedAt.set(handler, path)
    }
    return use.apply(this, args as Parameters<typeof use>)
  })
  const app = build(true)
  spy.mockRestore()

  const operations = new Set<string>()
  const walk = (stack: readonly RouteLayer[], prefix: string) => {
    for (const layer of stack) {
      const nested = (layer.handle as { stack?: RouteLayer[] }).stack
      if (layer.route) {
        const paths = [layer.route.path].flat()
        for (const path of paths) {
          const full = `${prefix}${path}`.replace(/(.)\/$/, '$1')
          for (const method of Object.keys(layer.route.methods)) {
            operations.add(`${method.toUpperCase()} ${full}`)
          }
        }
      } else if (nested) {
        walk(nested, prefix + (mountedAt.get(layer.handle) ?? ''))
      }
    }
  }
  walk((app as unknown as { router: { stack: RouteLayer[] } }).router.stack, '')

  return new Set(
    [...operations].filter((op) => {
      const path = op.split(' ')[1]!
      return path.startsWith(API_PREFIX) && !path.startsWith(DOCS_PREFIX)
    }),
  )
}

function specOperations(): Set<string> {
  const spec = loadOpenApiSpec()
  const operations = new Set<string>()
  for (const [path, item] of Object.entries(spec.paths)) {
    for (const method of HTTP_METHODS) {
      if (method in item) {
        const express = `${API_PREFIX}${path.replace(/\{(\w+)\}/g, ':$1')}`.replace(/(.)\/$/, '$1')
        operations.add(`${method.toUpperCase()} ${express}`)
      }
    }
  }
  return operations
}

describe('documentation OpenAPI', () => {
  it('décrit chaque route de l’API', () => {
    const missing = [...expressOperations()].filter((op) => !specOperations().has(op))
    expect(missing).toEqual([])
  })

  it('ne décrit aucune route qui n’existe pas', () => {
    const unknown = [...specOperations()].filter((op) => !expressOperations().has(op))
    expect(unknown).toEqual([])
  })

  it('annonce OpenAPI 3.1 et le préfixe de l’API', () => {
    const spec = loadOpenApiSpec()
    expect(spec.openapi).toMatch(/^3\.1\./)
    expect(spec.servers).toEqual([{ url: API_PREFIX }])
  })
})

describe('Swagger UI', () => {
  let server: Server | undefined

  const start = async (apiDocs?: boolean) => {
    const app = build(apiDocs)
    server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, () => resolve(s))
    })
    return `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  }

  afterEach(
    () =>
      new Promise<void>((resolve, reject) => {
        if (!server) return resolve()
        server.close((err) => (err ? reject(err) : resolve()))
        server = undefined
      }),
  )

  it('sert la page et la spécification quand la documentation est activée', async () => {
    const base = await start(true)

    const page = await fetch(`${base}${DOCS_PREFIX}/`)
    expect(page.status).toBe(200)
    expect(page.headers.get('content-type')).toContain('text/html')
    expect(await page.text()).toContain('swagger-ui')

    const spec = await fetch(`${base}${DOCS_PREFIX}/openapi.json`)
    expect(spec.status).toBe(200)
    expect(await spec.json()).toEqual(loadOpenApiSpec())
  })

  it('n’existe pas par défaut (production)', async () => {
    const base = await start()

    expect((await fetch(`${base}${DOCS_PREFIX}/`)).status).toBe(404)
    expect((await fetch(`${base}${DOCS_PREFIX}/openapi.json`)).status).toBe(404)
  })
})
