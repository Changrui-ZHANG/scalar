import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import express from 'express'
import { EventController } from './event.controller.ts'

describe('POST /api/v1/events', () => {
  let server: Server
  let base: string

  beforeAll(async () => {
    const app = express()
    app.use(express.json())
    app.use('/api/v1/events', new EventController().buildRouter())
    server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, () => resolve(s))
    })
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/events`
  })

  afterAll(
    () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()))
      }),
  )

  const post = async (body: unknown) => {
    const res = await fetch(base, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = (await res.json()) as { success: boolean; data: unknown; error: string | null }
    return { status: res.status, body: json }
  }

  it('accepte un événement lesson_completed valide et répond 200 avec data null', async () => {
    const { status, body } = await post({
      type: 'lesson_completed',
      track: 'javascript',
      chapter: 'conditions',
      slug: 'decision',
    })

    expect(status).toBe(200)
    expect(body).toEqual({
      success: true,
      data: null,
      error: null,
    })
  })

  it('accepte un événement exercise_completed valide', async () => {
    const { status, body } = await post({
      type: 'exercise_completed',
      track: 'javascript',
      chapter: 'conditions',
      slug: 'est-pair',
    })

    expect(status).toBe(200)
    expect(body.success).toBe(true)
  })

  it('accepte un événement chapter_completed valide sans slug', async () => {
    const { status, body } = await post({
      type: 'chapter_completed',
      track: 'javascript',
      chapter: 'conditions',
    })

    expect(status).toBe(200)
    expect(body.success).toBe(true)
  })

  it('refuse un événement chapter_completed qui contient un slug (400)', async () => {
    const { status, body } = await post({
      type: 'chapter_completed',
      track: 'javascript',
      chapter: 'conditions',
      slug: 'interdit',
    })

    expect(status).toBe(400)
    expect(body.success).toBe(false)
  })

  it('refuse un événement lesson_completed sans slug (400)', async () => {
    const { status, body } = await post({
      type: 'lesson_completed',
      track: 'javascript',
      chapter: 'conditions',
    })

    expect(status).toBe(400)
    expect(body.success).toBe(false)
  })

  it('refuse un type d’événement inconnu (400)', async () => {
    const { status, body } = await post({
      type: 'unknown_type',
      track: 'javascript',
      chapter: 'conditions',
    })

    expect(status).toBe(400)
    expect(body.success).toBe(false)
  })
})
