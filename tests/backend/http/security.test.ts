import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it, vi } from 'vitest'

import express from 'express'

import { errorHandler, routeNotFound } from '../../../backend/src/http/errors.ts'
import { secure } from '../../../backend/src/http/security.ts'
import { logger } from '../../../backend/src/logger.ts'

const servers: Server[] = []

async function start(hsts: boolean): Promise<string> {
  const app = express()
  secure(app, hsts)
  app.use(express.json())
  app.get('/ok', (_req, res) => {
    res.json({ success: true, data: null, error: null })
  })
  app.get('/panne', () => {
    throw new Error('panne')
  })
  app.post('/json', (_req, res) => {
    res.json({ success: true, data: null, error: null })
  })
  app.use(routeNotFound)
  app.use(errorHandler)
  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, () => resolve(s))
  })
  servers.push(server)
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`
}

afterEach(async () => {
  vi.restoreAllMocks()
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((err) => (err ? reject(err) : resolve()))
        }),
    ),
  )
})

const CASES: [string, (base: string) => Promise<Response>][] = [
  ['succès', (base) => fetch(`${base}/ok`)],
  ['route inconnue (404)', (base) => fetch(`${base}/nulle-part`)],
  ['erreur non prévue (500)', (base) => fetch(`${base}/panne`)],
  [
    'JSON illisible (400)',
    (base) =>
      fetch(`${base}/json`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{pas du json',
      }),
  ],
]

describe('en-têtes de sécurité', () => {
  it.each(CASES)('sont posés sur la réponse : %s', async (_name, call) => {
    vi.spyOn(logger, 'error').mockImplementation(() => undefined)
    const res = await call(await start(false))

    expect(res.headers.get('content-security-policy')).toBe(
      "default-src 'none'; frame-ancestors 'none'",
    )
    expect(res.headers.get('referrer-policy')).toBe('no-referrer')
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('x-powered-by')).toBeNull()
  })

  it('n’envoient pas HSTS hors production', async () => {
    const base = await start(false)

    expect((await fetch(`${base}/ok`)).headers.get('strict-transport-security')).toBeNull()
  })

  it('envoient HSTS en production, y compris sur les erreurs', async () => {
    vi.spyOn(logger, 'error').mockImplementation(() => undefined)
    const base = await start(true)

    for (const path of ['/ok', '/nulle-part', '/panne']) {
      expect((await fetch(`${base}${path}`)).headers.get('strict-transport-security')).toBe(
        'max-age=31536000',
      )
    }
  })
})
