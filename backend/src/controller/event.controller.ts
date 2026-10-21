import { Router } from 'express'
import type { Request, Response } from 'express'
import { EVENT_TYPES, type EventType } from '@scalar/shared/enums'

export interface ValidatedEvent {
  readonly type: EventType
  readonly track: string
  readonly chapter: string
  readonly slug?: string
}

function parseEventBody(body: unknown): { ok: true; event: ValidatedEvent } | { ok: false; error: string } {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, error: 'Corps d’événement invalide.' }
  }

  const record = body as Record<string, unknown>
  const type = record.type
  if (typeof type !== 'string' || !EVENT_TYPES.includes(type as EventType)) {
    return { ok: false, error: 'Type d’événement invalide.' }
  }

  if (typeof record.track !== 'string' || record.track.trim() === '') {
    return { ok: false, error: 'Parcours manquant ou invalide.' }
  }

  if (typeof record.chapter !== 'string' || record.chapter.trim() === '') {
    return { ok: false, error: 'Chapitre manquant ou invalide.' }
  }

  if (type === 'chapter_completed') {
    if (record.slug !== undefined) {
      return { ok: false, error: 'Le champ slug est interdit pour un événement de chapitre.' }
    }
    return {
      ok: true,
      event: {
        type: 'chapter_completed',
        track: record.track.trim(),
        chapter: record.chapter.trim(),
      },
    }
  }

  // lesson_completed ou exercise_completed
  if (typeof record.slug !== 'string' || record.slug.trim() === '') {
    return { ok: false, error: 'Le champ slug est obligatoire pour cet événement.' }
  }

  return {
    ok: true,
    event: {
      type: type as 'lesson_completed' | 'exercise_completed',
      track: record.track.trim(),
      chapter: record.chapter.trim(),
      slug: record.slug.trim(),
    },
  }
}

export class EventController {
  async recordEvent(req: Request, res: Response) {
    const parsed = parseEventBody(req.body)
    if (!parsed.ok) {
      res.status(400).json({ success: false, data: null, error: parsed.error })
      return
    }

    // Répond 200 même si l'élément est introuvable (specs-backend.md § 12.2)
    res.json({ success: true, data: null, error: null })
  }

  buildRouter() {
    const router = Router()
    router.post('/', this.recordEvent.bind(this))
    return router
  }
}
