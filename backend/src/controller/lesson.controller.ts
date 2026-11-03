import { Router } from 'express'
import type { Request, Response } from 'express'

import { MESSAGES } from '../constants.ts'
import { respond } from '../http/envelope.ts'
import type { LessonService } from '../service/lesson.service.ts'

type LessonParams = { track: string; chapter: string; lesson: string }

export class LessonController {
  private readonly service: LessonService

  constructor(service: LessonService) {
    this.service = service
  }

  async getLesson(req: Request<LessonParams>, res: Response) {
    const { track, chapter, lesson } = req.params
    await respond(res, MESSAGES.lessonNotFound, () =>
      this.service.getLesson(track, chapter, lesson),
    )
  }

  buildRouter() {
    const router = Router()
    router.get('/tracks/:track/chapters/:chapter/lessons/:lesson', this.getLesson.bind(this))
    return router
  }
}
