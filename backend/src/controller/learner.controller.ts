import { Router } from 'express'
import type { Request, Response } from 'express'

import { MESSAGES } from '../constants.ts'
import { ok, respond } from '../http/envelope.ts'
import { contentUnavailable } from '../http/errors.ts'
import type { LearnerService } from '../service/learner.service.ts'

export class LearnerController {
  private readonly service: LearnerService

  constructor(service: LearnerService) {
    this.service = service
  }

  async createLearner(_req: Request, res: Response) {
    try {
      const learner = await this.service.createLearner()
      res.status(201)
      ok(res, learner)
    } catch (error: unknown) {
      contentUnavailable(res, error)
    }
  }

  async getProgress(req: Request<{ learnerId: string }>, res: Response) {
    await respond(res, MESSAGES.learnerNotFound, () =>
      this.service.getProgress(req.params.learnerId),
    )
  }

  buildRouter() {
    const router = Router()
    router.post('/learners', this.createLearner.bind(this))
    router.get('/learners/:learnerId/progress', this.getProgress.bind(this))
    return router
  }
}
