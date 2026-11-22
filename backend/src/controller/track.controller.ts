import { Router } from 'express'
import type { Request, Response } from 'express'

import { MESSAGES } from '../constants.ts'
import { ok, respond } from '../http/envelope.ts'
import { contentUnavailable } from '../http/errors.ts'
import type { PremiumService } from '../service/premium.service.ts'
import type { TrackService } from '../service/track.service.ts'

export class TrackController {
  private readonly service: TrackService
  private readonly premium: PremiumService

  constructor(service: TrackService, premium: PremiumService) {
    this.service = service
    this.premium = premium
  }

  async listTracks(_req: Request, res: Response) {
    try {
      ok(res, await this.service.listTracks())
    } catch (error: unknown) {
      contentUnavailable(res, error)
    }
  }

  async getTrack(req: Request<{ track: string }>, res: Response) {
    await respond(res, MESSAGES.trackNotFound, async () => {
      const view = await this.service.getTrack(req.params.track)
      return (
        view && {
          ...view,
          chapters: view.chapters.map((c) => ({
            ...c,
            free: this.premium.isFreeChapter(c.number),
          })),
        }
      )
    })
  }

  buildRouter() {
    const router = Router()
    router.get('/tracks', this.listTracks.bind(this))
    router.get('/tracks/:track', this.getTrack.bind(this))
    return router
  }
}
