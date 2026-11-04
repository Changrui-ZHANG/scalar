import express from 'express'
import type { Express } from 'express'

import type { Config } from './config.ts'
import { MAX_BODY_BYTES } from './constants.ts'
import { ExecutionController } from './controller/execution.controller.ts'
import { ExerciseController } from './controller/exercise.controller.ts'
import { LessonController } from './controller/lesson.controller.ts'
import { TrackController } from './controller/track.controller.ts'
import { errorHandler, routeNotFound } from './http/errors.ts'
import { executionRateLimiter } from './http/rate-limit.ts'
import { secure } from './http/security.ts'
import type { ExerciseRepository } from './repository/exercise.repository.ts'
import type { LessonRepository } from './repository/lesson.repository.ts'
import type { TrackRepository } from './repository/track.repository.ts'
import { ExerciseService } from './service/exercise.service.ts'
import { LessonService } from './service/lesson.service.ts'
import { TrackService } from './service/track.service.ts'

export interface AppDependencies {
  readonly tracks: TrackRepository
  readonly lessons: LessonRepository
  readonly exercises: ExerciseRepository
  readonly contentSource: Config['CONTENT_SOURCE']
  readonly isDatabaseUp: () => Promise<boolean>
  readonly executionRateLimit: Config['EXECUTION_RATE_LIMIT']
  readonly trustProxyHops: Config['TRUST_PROXY_HOPS']
}

export function buildApp(deps: AppDependencies): Express {
  const { tracks, lessons, exercises } = deps
  const app = express()
  // Sans le bon nombre de proxys, req.ip vaut l'adresse de Traefik (un seul compteur pour tous) ou se laisse usurper par X-Forwarded-For.
  app.set('trust proxy', deps.trustProxyHops)
  secure(app)
  const limitExecutions = executionRateLimiter(deps.executionRateLimit)
  app.use(express.json({ limit: MAX_BODY_BYTES }))

  app.get('/api/v1', (_req, res) => {
    res.json({ status: 'ok', message: 'API Scalar (Backend)' })
  })

  app.get('/api/v1/health', async (_req, res) => {
    res.json({
      status: 'ok',
      content: deps.contentSource,
      database: (await deps.isDatabaseUp()) ? 'connected' : 'disconnected',
    })
  })

  app.use('/api/v1/executions', new ExecutionController(limitExecutions).buildRouter())
  app.use(
    '/api/v1',
    new TrackController(new TrackService(tracks, lessons, exercises)).buildRouter(),
  )
  app.use('/api/v1', new LessonController(new LessonService(tracks, lessons)).buildRouter())
  app.use(
    '/api/v1',
    new ExerciseController(new ExerciseService(tracks, exercises), limitExecutions).buildRouter(),
  )

  app.use(routeNotFound)
  app.use(errorHandler)
  return app
}
