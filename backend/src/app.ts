import express from 'express'
import type { Express } from 'express'

import type { Config } from './config.ts'
import { MAX_BODY_BYTES } from './constants.ts'
import { ExecutionController } from './controller/execution.controller.ts'
import { ExerciseController } from './controller/exercise.controller.ts'
import { LessonController } from './controller/lesson.controller.ts'
import { QuestionnaireController } from './controller/questionnaire.controller.ts'
import { TrackController } from './controller/track.controller.ts'
import { errorHandler, routeNotFound } from './http/errors.ts'
import { secure } from './http/security.ts'
import type { ExerciseRepository } from './repository/exercise.repository.ts'
import type { LessonRepository } from './repository/lesson.repository.ts'
import type { QuestionnaireRepository } from './repository/questionnaire.repository.ts'
import type { TrackRepository } from './repository/track.repository.ts'
import { ExerciseService } from './service/exercise.service.ts'
import { LessonService } from './service/lesson.service.ts'
import { QuestionnaireService } from './service/questionnaire.service.ts'
import { TrackService } from './service/track.service.ts'

export interface AppDependencies {
  readonly tracks: TrackRepository
  readonly lessons: LessonRepository
  readonly exercises: ExerciseRepository
  readonly questionnaire: QuestionnaireRepository
  readonly contentSource: Config['CONTENT_SOURCE']
  readonly isDatabaseUp: () => Promise<boolean>
}

export function buildApp(deps: AppDependencies): Express {
  const { tracks, lessons, exercises, questionnaire } = deps
  const app = express()
  secure(app)
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

  app.use('/api/v1/executions', new ExecutionController().buildRouter())
  app.use(
    '/api/v1',
    new TrackController(new TrackService(tracks, lessons, exercises)).buildRouter(),
  )
  app.use('/api/v1', new LessonController(new LessonService(tracks, lessons)).buildRouter())
  app.use('/api/v1', new ExerciseController(new ExerciseService(tracks, exercises)).buildRouter())
  app.use(
    '/api/v1',
    new QuestionnaireController(new QuestionnaireService(questionnaire, tracks)).buildRouter(),
  )

  app.use(routeNotFound)
  app.use(errorHandler)
  return app
}
