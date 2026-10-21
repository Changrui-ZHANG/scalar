import { Router } from 'express'
import type { Request, Response } from 'express'
import type { LessonService } from '../services/lesson.service.ts'
import { respond } from './respond.ts'

type LessonParams = { track: string; chapter: string; lesson: string }

export class LessonController {
  private readonly service: LessonService

  constructor(service: LessonService) {
    this.service = service
  }

  async getLesson(req: Request<LessonParams>, res: Response) {
    const { track, chapter, lesson } = req.params
    await respond(res, 'Cours introuvable.', () => this.service.getLesson(track, chapter, lesson))
  }

  buildRouter() {
    const router = Router()
    router.get('/tracks/:track/chapters/:chapter/lessons/:lesson', this.getLesson.bind(this))
    return router
  }
}
