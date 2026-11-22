import { Router } from 'express'
import type { Request, Response } from 'express'

import { MESSAGES } from '../constants.ts'
import { badRequest, fail, notFound, ok, respond } from '../http/envelope.ts'
import { contentUnavailable } from '../http/errors.ts'
import type { TrackRepository } from '../repository/track.repository.ts'
import type { CertificateService } from '../service/certificate.service.ts'
import { certificateRequestSchema } from '../service/certificate.service.ts'
import type { PremiumService } from '../service/premium.service.ts'

export class CertificateController {
  private readonly service: CertificateService
  private readonly premium: PremiumService
  private readonly tracks: TrackRepository

  constructor(service: CertificateService, premium: PremiumService, tracks: TrackRepository) {
    this.service = service
    this.premium = premium
    this.tracks = tracks
  }

  async issueCertificate(req: Request<{ learnerId: string }>, res: Response) {
    const parsed = certificateRequestSchema.safeParse(req.body ?? {})
    if (!parsed.success) {
      badRequest(res, parsed.error.issues[0]?.message ?? MESSAGES.invalidRequest)
      return
    }
    try {
      if (
        !(await this.isFreeTrack(parsed.data.track)) &&
        !(await this.premium.isPremium(req.params.learnerId))
      ) {
        fail(res, 403, MESSAGES.premiumRequired)
        return
      }
      const outcome = await this.service.issue(req.params.learnerId, parsed.data)
      switch (outcome.status) {
        case 'learner-not-found':
          notFound(res, MESSAGES.learnerNotFound)
          return
        case 'track-not-found':
          notFound(res, MESSAGES.trackNotFound)
          return
        case 'not-completed':
          fail(res, 403, MESSAGES.trackNotCompleted)
          return
        default:
          res.status(outcome.status === 'issued' ? 201 : 200)
          ok(res, outcome.certificate)
      }
    } catch (error: unknown) {
      contentUnavailable(res, error)
    }
  }

  private async isFreeTrack(slug: string): Promise<boolean> {
    const track = await this.tracks.findTrackBySlug(slug)
    return (
      track !== null && this.premium.isFreeTrack((await this.tracks.listChapters(track.id)).length)
    )
  }

  async verifyCertificate(req: Request<{ code: string }>, res: Response) {
    await respond(res, MESSAGES.certificateNotFound, () => this.service.verify(req.params.code))
  }

  buildRouter() {
    const router = Router()
    router.post('/learners/:learnerId/certificates', this.issueCertificate.bind(this))
    router.get('/certificates/:code', this.verifyCertificate.bind(this))
    return router
  }
}
