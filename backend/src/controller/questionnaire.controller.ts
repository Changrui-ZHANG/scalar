import { Router } from 'express'
import type { Request, Response } from 'express'

import { MESSAGES } from '../constants.ts'
import { badRequest, notFound, ok } from '../http/envelope.ts'
import { contentUnavailable, engineUnavailable } from '../http/errors.ts'
import { EngineUnavailableError, parseSubmission } from '../service/execution.service.ts'
import type { QuestionnaireService } from '../service/questionnaire.service.ts'
import { resultsSchema } from '../service/questionnaire.service.ts'

function failed(res: Response, error: unknown): void {
  if (error instanceof EngineUnavailableError) {
    engineUnavailable(res, error)
  } else {
    contentUnavailable(res, error)
  }
}

export class QuestionnaireController {
  private readonly service: QuestionnaireService

  constructor(service: QuestionnaireService) {
    this.service = service
  }

  async getQuestionnaire(_req: Request, res: Response) {
    try {
      ok(res, await this.service.getQuestionnaire())
    } catch (error: unknown) {
      contentUnavailable(res, error)
    }
  }

  async verifyExercise(req: Request<{ questionId: string }>, res: Response) {
    const questionId = Number(req.params.questionId)
    if (!Number.isSafeInteger(questionId)) {
      notFound(res, MESSAGES.questionNotFound)
      return
    }
    const parsed = parseSubmission(req.body)
    if (!parsed.ok) {
      badRequest(res, parsed.error)
      return
    }
    try {
      const { code, programmingLanguage } = parsed.submission
      const verification = await this.service.verify(questionId, code, programmingLanguage)
      if (verification === null) {
        notFound(res, MESSAGES.questionNotFound)
      } else if (!verification.ok) {
        badRequest(res, verification.error)
      } else {
        ok(res, verification.result)
      }
    } catch (error: unknown) {
      failed(res, error)
    }
  }

  async submitResults(req: Request, res: Response) {
    const parsed = resultsSchema.safeParse(req.body ?? {})
    if (!parsed.success) {
      badRequest(res, parsed.error.issues[0]?.message ?? MESSAGES.invalidRequest)
      return
    }
    try {
      const outcome = await this.service.submitResults(parsed.data)
      if (outcome.ok) {
        ok(res, outcome.result)
      } else {
        badRequest(res, outcome.error)
      }
    } catch (error: unknown) {
      failed(res, error)
    }
  }

  buildRouter() {
    const router = Router()
    router.get('/questionnaire', this.getQuestionnaire.bind(this))
    router.post(
      '/questionnaire/exercises/:questionId/verifications',
      this.verifyExercise.bind(this),
    )
    router.post('/questionnaire/results', this.submitResults.bind(this))
    return router
  }
}
