import { SUBSCRIPTION_STATUSES } from '@scalar/shared/enums'
import { Router } from 'express'
import type { Request, Response } from 'express'
import { z } from 'zod'

import { MESSAGES } from '../constants.ts'
import { badRequest, ok } from '../http/envelope.ts'
import { contentUnavailable } from '../http/errors.ts'
import type { AdminUsersService } from '../service/admin-users.service.ts'

const filterSchema = z.object({
  email: z.string().optional(),
  subscription: z.enum([...SUBSCRIPTION_STATUSES, 'none']).optional(),
})

/** Monte sous /api/v1/admin, donc derriere requireAdmin. Lecture seule. */
export class AdminUsersController {
  private readonly service: AdminUsersService

  constructor(service: AdminUsersService) {
    this.service = service
  }

  async listUsers(req: Request, res: Response) {
    const parsed = filterSchema.safeParse(req.query)
    if (!parsed.success) {
      badRequest(res, MESSAGES.invalidSubscriptionFilter)
      return
    }
    try {
      ok(res, await this.service.listUsers(parsed.data))
    } catch (error: unknown) {
      contentUnavailable(res, error)
    }
  }

  async metrics(_req: Request, res: Response) {
    try {
      ok(res, await this.service.metrics())
    } catch (error: unknown) {
      contentUnavailable(res, error)
    }
  }

  buildRouter() {
    const router = Router()
    router.get('/users', this.listUsers.bind(this))
    router.get('/metrics', this.metrics.bind(this))
    return router
  }
}
