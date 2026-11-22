import { SUBSCRIPTION_PLANS } from '@scalar/shared/enums'
import express, { Router } from 'express'
import type { Request, Response } from 'express'
import { z } from 'zod'

import { MAX_BODY_BYTES, MESSAGES } from '../constants.ts'
import { badRequest, fail, notFound, ok } from '../http/envelope.ts'
import { billingUnavailable, contentUnavailable } from '../http/errors.ts'
import type { SessionSettings } from '../http/require-auth.ts'
import { currentUser, requireAuth } from '../http/require-auth.ts'
import { BillingUnavailableError } from '../service/billing-unavailable.error.ts'
import type { BillingService, RedirectOutcome } from '../service/billing.service.ts'

const checkoutSchema = z.object({ plan: z.enum(SUBSCRIPTION_PLANS) })

export class BillingController {
  private readonly service: BillingService
  private readonly session: SessionSettings

  constructor(service: BillingService, session: SessionSettings) {
    this.service = service
    this.session = session
  }

  async checkout(req: Request, res: Response) {
    const parsed = checkoutSchema.safeParse(req.body ?? {})
    if (!parsed.success) {
      badRequest(res, MESSAGES.invalidPlan)
      return
    }
    await this.guard(res, async () => {
      const outcome = await this.service.checkout(currentUser(res).id, parsed.data.plan)
      if (outcome.status === 'already-premium') {
        fail(res, 409, MESSAGES.alreadyPremium)
        return
      }
      this.redirect(res, outcome, 201)
    })
  }

  async portal(_req: Request, res: Response) {
    await this.guard(res, async () => {
      const outcome = await this.service.portal(currentUser(res).id)
      if (outcome.status === 'no-subscription') {
        notFound(res, MESSAGES.noSubscription)
        return
      }
      this.redirect(res, outcome, 200)
    })
  }

  async webhook(req: Request, res: Response) {
    const signature = req.get('stripe-signature')
    const payload = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0)
    await this.guard(res, async () => {
      const outcome =
        signature === undefined
          ? 'invalid-signature'
          : await this.service.handleWebhook(payload, signature)
      if (outcome === 'unavailable') {
        fail(res, 503, MESSAGES.billingUnavailable)
      } else if (outcome === 'invalid-signature') {
        badRequest(res, MESSAGES.invalidWebhookSignature)
      } else {
        ok(res, { received: true })
      }
    })
  }

  async status(_req: Request, res: Response) {
    await this.guard(res, async () => ok(res, await this.service.status(currentUser(res).id)))
  }

  /** Avant express.json : la signature Stripe porte sur le corps brut, octet pour octet. */
  buildWebhookRouter() {
    const router = Router()
    router.post(
      '/billing/webhook',
      express.raw({ type: '*/*', limit: MAX_BODY_BYTES }),
      this.webhook.bind(this),
    )
    return router
  }

  buildRouter() {
    const router = Router()
    const auth = requireAuth(this.session)
    router.post('/billing/checkout', auth, this.checkout.bind(this))
    router.post('/billing/portal', auth, this.portal.bind(this))
    router.get('/billing/subscription', auth, this.status.bind(this))
    return router
  }

  private redirect(res: Response, outcome: RedirectOutcome, status: number): void {
    if (outcome.status === 'unavailable') {
      fail(res, 503, MESSAGES.billingUnavailable)
      return
    }
    res.status(status)
    ok(res, { url: outcome.url })
  }

  private async guard(res: Response, run: () => Promise<void>): Promise<void> {
    try {
      await run()
    } catch (error: unknown) {
      if (error instanceof BillingUnavailableError) {
        billingUnavailable(res, error)
      } else {
        contentUnavailable(res, error)
      }
    }
  }
}
