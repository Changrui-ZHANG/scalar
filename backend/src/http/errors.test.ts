import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import express from 'express'

import { MESSAGES } from '../constants.ts'
import { errorHandler, routeNotFound } from './errors.ts'

describe('gestionnaire d’erreurs', () => {
  let server: Server
  let base: string

  beforeAll(async () => {
    const app = express()
    app.get('/panne', () => {
      throw new Error('secret interne : postgres:5432')
    })
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

  it('répond 500 en JSON, sans le détail de l’erreur', async () => {
    const res = await fetch(`${base}/panne`)
    const text = await res.text()

    expect(res.status).toBe(500)
    expect(JSON.parse(text)).toEqual({ success: false, data: null, error: MESSAGES.internalError })
    expect(text.includes('postgres')).toBe(false)
  })

  it('garde le statut 4xx d’une erreur client', async () => {
    const res = await fetch(`${base}/trop-gros`)

    expect(res.status).toBe(413)
    expect(await res.json()).toEqual({ success: false, data: null, error: MESSAGES.invalidRequest })
  })

  it('répond 404 en JSON sur une route inconnue', async () => {
    const res = await fetch(`${base}/nulle-part`)

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ success: false, data: null, error: MESSAGES.routeNotFound })
  })
})
