import { Router } from 'express'
import type { Request, Response } from 'express'

import { MESSAGES } from '../constants.ts'
import { badRequest, fail, notFound, ok, respond } from '../http/envelope.ts'
import { contentUnavailable } from '../http/errors.ts'
import type { CertificateService } from '../service/certificate.service.ts'
import { certificateRequestSchema } from '../service/certificate.service.ts'

export class CertificateController {
  private readonly service: CertificateService

  constructor(service: CertificateService) {
    this.service = service
  }

  async issueCertificate(req: Request<{ learnerId: string }>, res: Response) {
    const parsed = certificateRequestSchema.safeParse(req.body ?? {})
    if (!parsed.success) {
      badRequest(res, parsed.error.issues[0]?.message ?? MESSAGES.invalidRequest)
      return
    }
    try {
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
