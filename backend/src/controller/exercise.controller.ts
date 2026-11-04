import { Router } from 'express'
import type { Request, RequestHandler, Response } from 'express'

import { MESSAGES } from '../constants.ts'
import { badRequest, notFound, ok, respond } from '../http/envelope.ts'
import { contentUnavailable, engineUnavailable } from '../http/errors.ts'
import { EngineUnavailableError, parseSubmission } from '../service/execution.service.ts'
import type { ExerciseService } from '../service/exercise.service.ts'

type ExerciseParams = { track: string; chapter: string; exercise: string }

export class ExerciseController {
  private readonly service: ExerciseService
  private readonly rateLimiter: RequestHandler

  constructor(service: ExerciseService, rateLimiter: RequestHandler) {
    this.service = service
    this.rateLimiter = rateLimiter
  }

  async getExercise(req: Request<ExerciseParams>, res: Response) {
    const { track, chapter, exercise } = req.params
    await respond(res, MESSAGES.exerciseNotFound, () =>
      this.service.getExercise(track, chapter, exercise),
    )
  }

  async verifyExercise(req: Request<ExerciseParams>, res: Response) {
    const parsed = parseSubmission({ code: (req.body as { code?: unknown } | undefined)?.code })
    if (!parsed.ok) {
      badRequest(res, parsed.error)
      return
    }
    const { track, chapter, exercise } = req.params
    try {
      const verification = await this.service.verify(
        track,
        chapter,
        exercise,
        parsed.submission.code,
      )
      if (verification === null) {
        notFound(res, MESSAGES.exerciseNotFound)
      } else if (!verification.ok) {
        badRequest(res, verification.error)
      } else {
        ok(res, verification.result)
      }
    } catch (error: unknown) {
      if (error instanceof EngineUnavailableError) {
        engineUnavailable(res, error)
      } else {
        contentUnavailable(res, error)
      }
    }
  }

  buildRouter() {
    const router = Router()
    const path = '/tracks/:track/chapters/:chapter/exercises/:exercise'
    router.get(path, this.getExercise.bind(this))
    router.post(`${path}/verifications`, this.rateLimiter, this.verifyExercise.bind(this))
    return router
  }
}
