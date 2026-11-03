import { Router } from 'express'
import type { Request, Response } from 'express'

import { MESSAGES } from '../constants.ts'
import { respond } from '../http/envelope.ts'
import type { TrackService } from '../service/track.service.ts'

export class TrackController {
  private readonly service: TrackService

  constructor(service: TrackService) {
    this.service = service
  }

  async listTracks(_req: Request, res: Response) {
    await respond(res, MESSAGES.noTracks, () => this.service.listTracks())
  }

  async getTrack(req: Request<{ track: string }>, res: Response) {
    await respond(res, MESSAGES.trackNotFound, () => this.service.getTrack(req.params.track))
  }

  buildRouter() {
    const router = Router()
    router.get('/tracks', this.listTracks.bind(this))
    router.get('/tracks/:track', this.getTrack.bind(this))
    return router
  }
}
