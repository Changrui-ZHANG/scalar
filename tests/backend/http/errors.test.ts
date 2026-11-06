import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import express from 'express'

import { MESSAGES } from '../../../backend/src/constants.ts'
import { errorHandler, routeNotFound } from '../../../backend/src/http/errors.ts'

describe('gestionnaire d’erreurs', () => {
  let server: Server
  let base: string

  beforeAll(async () => {
    const app = express()
    app.get('/trop-gros', () => {
      throw Object.assign(new Error('request entity too large'), { status: 413 })
    })
    app.use(routeNotFound)
    app.use(errorHandler)
    server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, () => resolve(s))
    })
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })
  afterAll(
    () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()))
      }),
  )

  it('garde le statut 4xx d’une erreur client', async () => {
    const res = await fetch(`${base}/trop-gros`)

    expect(res.status).toBe(413)
    expect(await res.json()).toEqual({ success: false, data: null, error: MESSAGES.invalidRequest })
  })
})
