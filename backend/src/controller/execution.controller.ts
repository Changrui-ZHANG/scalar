import { Router } from 'express'
import type { Request, RequestHandler, Response } from 'express'

import { badRequest, ok } from '../http/envelope.ts'
import { engineUnavailable } from '../http/errors.ts'
import { executeCode, parseSubmission, toJavaScript } from '../service/execution.service.ts'

export class ExecutionController {
  private readonly rateLimiter: RequestHandler

  constructor(rateLimiter: RequestHandler) {
    this.rateLimiter = rateLimiter
  }

  async executeSubmission(req: Request, res: Response) {
    const parsed = parseSubmission(req.body)
    if (!parsed.ok) {
      badRequest(res, parsed.error)
      return
    }

    const { programmingLanguage, code } = parsed.submission
    const converted = toJavaScript(programmingLanguage, code)
    if (!converted.ok) {
      badRequest(res, converted.error)
      return
    }

    try {
      ok(res, await executeCode(converted.code))
    } catch (error: unknown) {
      engineUnavailable(res, error)
    }
  }

  buildRouter() {
    const router = Router()
    router.post('/', this.rateLimiter, this.executeSubmission.bind(this))
    return router
  }
}
