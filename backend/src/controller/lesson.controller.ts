import { Router } from 'express'
import type { Request, Response } from 'express'

import { MESSAGES } from '../constants.ts'
import { badRequest, notFound, ok, respond } from '../http/envelope.ts'
import { contentUnavailable } from '../http/errors.ts'
import { currentLearnerId } from '../http/learner-access.ts'
import type { LearnerService } from '../service/learner.service.ts'
import type { LessonService } from '../service/lesson.service.ts'

type LessonParams = { track: string; chapter: string; lesson: string }

export class LessonController {
  private readonly service: LessonService
  private readonly learners: LearnerService

  constructor(service: LessonService, learners: LearnerService) {
    this.service = service
    this.learners = learners
  }

  async getLesson(req: Request<LessonParams>, res: Response) {
    const { track, chapter, lesson } = req.params
    await respond(res, MESSAGES.lessonNotFound, () =>
      this.service.getLesson(track, chapter, lesson),
    )
  }

  /** Lecon terminee par l'apprenant de X-Learner-Id ou de la session (pose par learnerAccess). */
  async completeLesson(req: Request<LessonParams>, res: Response) {
    const learnerId = currentLearnerId(res)
    if (learnerId === undefined) {
      badRequest(res, MESSAGES.learnerRequired)
      return
    }
    const { track, chapter, lesson } = req.params
    try {
      const completion = await this.learners.completeLesson(learnerId, track, chapter, lesson)
      if (completion === null) {
        notFound(res, MESSAGES.lessonNotFound)
        return
      }
      ok(res, completion)
    } catch (error: unknown) {
      contentUnavailable(res, error)
    }
  }

  buildRouter() {
    const router = Router()
    router.get('/tracks/:track/chapters/:chapter/lessons/:lesson', this.getLesson.bind(this))
    router.post(
      '/tracks/:track/chapters/:chapter/lessons/:lesson/completions',
      this.completeLesson.bind(this),
    )
    return router
  }
}
