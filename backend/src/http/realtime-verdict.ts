import type { IncomingMessage } from 'node:http'
import type { Duplex } from 'node:stream'

import { WebSocketServer } from 'ws'
import type { RawData, WebSocket } from 'ws'
import { z } from 'zod'

import { MAX_BODY_BYTES, MESSAGES, RATE_LIMIT_WINDOW_MS } from '../constants.ts'
import { logger } from '../logger.ts'
import type { TrackRepository } from '../repository/track.repository.ts'
import { EngineUnavailableError, parseSubmission } from '../service/execution.service.ts'
import type { ExerciseService } from '../service/exercise.service.ts'
import type { LearnerService } from '../service/learner.service.ts'
import type { PremiumService } from '../service/premium.service.ts'
import { RealtimeRefusal as Refusal } from './realtime-refusal.ts'
import type { SessionSettings } from './require-auth.ts'
import { sessionUserOf } from './require-auth.ts'
import { isChapterLocked } from './require-premium.ts'

export const REALTIME_PATH = '/api/v1/ws'

const messageSchema = z.object({
  type: z.literal('verify'),
  track: z.string(),
  chapter: z.string(),
  exercise: z.string(),
  code: z.unknown(),
  // Un navigateur ne peut pas ajouter d'en-tete X-Learner-Id a un WebSocket : il vient dans le message.
  learnerId: z.string().optional(),
})

export interface RealtimeDependencies {
  readonly session: SessionSettings
  readonly learners: LearnerService
  readonly exercises: ExerciseService
  readonly tracks: TrackRepository
  readonly premium: PremiumService
  /** Verifications par minute et par adresse IP, comme la route HTTP, mais compteur a part. */
  readonly executionRateLimit: number
}

type Outgoing =
  | { readonly type: 'received' | 'running' }
  | {
      readonly type: 'check'
      readonly index: number
      readonly total: number
      readonly check: unknown
    }
  | { readonly type: 'verdict'; readonly result: unknown }
  | { readonly type: 'error'; readonly status: number; readonly error: string }

// Meme regle qu'Express avec `trust proxy` a 1 : l'adresse ajoutee par Traefik, sinon celle du socket.
function clientIp(req: IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for']
  const chain = (Array.isArray(forwarded) ? forwarded.join(',') : (forwarded ?? '')).split(',')
  return chain.at(-1)?.trim() || req.socket.remoteAddress || ''
}

/** Verdict d'un exercice pousse etape par etape ; la route HTTP reste le repli. */
export class RealtimeVerdictGateway {
  private readonly deps: RealtimeDependencies
  private readonly server = new WebSocketServer({ noServer: true, maxPayload: MAX_BODY_BYTES })
  private readonly attempts = new Map<string, number[]>()

  constructor(deps: RealtimeDependencies) {
    this.deps = deps
  }

  /** A brancher sur l'evenement `upgrade` du serveur HTTP. */
  readonly handleUpgrade = (req: IncomingMessage, socket: Duplex, head: Buffer): void => {
    if (new URL(req.url ?? '/', 'http://localhost').pathname !== REALTIME_PATH) {
      socket.destroy()
      return
    }
    this.server.handleUpgrade(req, socket, head, (ws) => this.connect(ws, req))
  }

  private connect(ws: WebSocket, req: IncomingMessage): void {
    let busy = false
    ws.on('message', async (data: RawData) => {
      const send = (message: Outgoing) => ws.send(JSON.stringify(message))
      if (busy) {
        send({ type: 'error', status: 409, error: MESSAGES.verificationInProgress })
        return
      }
      busy = true
      try {
        await this.verify(req, data, send)
      } catch (error: unknown) {
        if (error instanceof Refusal) {
          send({ type: 'error', status: error.status, error: error.message })
        } else if (error instanceof EngineUnavailableError) {
          logger.error({ err: error }, 'Échec de l’appel au moteur d’exécution')
          send({ type: 'error', status: 503, error: MESSAGES.engineUnavailable })
        } else {
          logger.error({ err: error }, 'Vérification en temps réel impossible')
          send({ type: 'error', status: 500, error: MESSAGES.contentUnavailable })
        }
      } finally {
        busy = false
      }
    })
  }

  // Meme ordre que la route HTTP : debit, apprenant, Premium, code, puis exercice et moteur.
  private async verify(
    req: IncomingMessage,
    data: RawData,
    send: (message: Outgoing) => void,
  ): Promise<void> {
    const message = this.parse(data)
    this.countAttempt(clientIp(req))
    const sessionUser = await sessionUserOf(this.deps.session, req)
    const learnerId = message.learnerId ?? sessionUser?.id
    if (learnerId !== undefined) {
      const access = await this.deps.learners.access(learnerId, sessionUser?.id ?? null)
      if (access === 'not-found') throw new Refusal(404, MESSAGES.learnerNotFound)
      if (access === 'unauthenticated') throw new Refusal(401, MESSAGES.unauthenticated)
      if (access === 'forbidden') throw new Refusal(403, MESSAGES.forbidden)
    }
    const { tracks, premium } = this.deps
    if (
      await isChapterLocked(
        tracks,
        premium,
        message.track,
        message.chapter,
        sessionUser?.id ?? null,
      )
    ) {
      throw new Refusal(403, MESSAGES.premiumRequired)
    }
    const submission = parseSubmission({ code: message.code })
    if (!submission.ok) {
      throw new Refusal(400, submission.error)
    }

    send({ type: 'received' })
    const verification = await this.deps.exercises.verify(
      message.track,
      message.chapter,
      message.exercise,
      submission.submission.code,
      () => send({ type: 'running' }),
    )
    if (verification === null) {
      throw new Refusal(404, MESSAGES.exerciseNotFound)
    }
    if (!verification.ok) {
      throw new Refusal(400, verification.error)
    }
    if (learnerId !== undefined) {
      await this.deps.learners.recordAttempt(
        learnerId,
        verification.exerciseId,
        verification.result.passed,
      )
    }
    const { checks } = verification.result
    checks.forEach((check, index) => send({ type: 'check', index, total: checks.length, check }))
    send({ type: 'verdict', result: verification.result })
  }

  private parse(data: RawData): z.infer<typeof messageSchema> {
    try {
      const parsed = messageSchema.safeParse(JSON.parse(String(data)))
      if (parsed.success) {
        return parsed.data
      }
    } catch {
      // JSON illisible : meme refus qu'un message de forme inconnue.
    }
    throw new Refusal(400, MESSAGES.invalidRequest)
  }

  private countAttempt(ip: string): void {
    const now = Date.now()
    const recent = (this.attempts.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
    if (recent.length >= this.deps.executionRateLimit) {
      this.attempts.set(ip, recent)
      throw new Refusal(429, MESSAGES.tooManyExecutions)
    }
    recent.push(now)
    this.attempts.set(ip, recent)
  }
}
