import express from 'express'
import type { Express } from 'express'

import type { Config } from './config.ts'
import { MAX_BODY_BYTES, MESSAGES } from './constants.ts'
import { ExecutionController } from './controller/execution.controller.ts'
import { CertificateController } from './controller/certificate.controller.ts'
import { ExerciseController } from './controller/exercise.controller.ts'
import { LearnerController } from './controller/learner.controller.ts'
import { LessonController } from './controller/lesson.controller.ts'
import { QuestionnaireController } from './controller/questionnaire.controller.ts'
import { TrackController } from './controller/track.controller.ts'
import { errorHandler, routeNotFound } from './http/errors.ts'
import { perMinuteLimiter } from './http/rate-limit.ts'
import { secure } from './http/security.ts'
import type { CertificateRepository } from './repository/certificate.repository.ts'
import type { ExerciseRepository } from './repository/exercise.repository.ts'
import type { LessonRepository } from './repository/lesson.repository.ts'
import type { PlacementRepository } from './repository/placement.repository.ts'
import type { ProgressRepository } from './repository/progress.repository.ts'
import type { QuestionnaireRepository } from './repository/questionnaire.repository.ts'
import type { TrackRepository } from './repository/track.repository.ts'
import type { UserRepository } from './repository/user.repository.ts'
import { CertificateService } from './service/certificate.service.ts'
import { ExerciseService } from './service/exercise.service.ts'
import { LearnerService } from './service/learner.service.ts'
import { LessonService } from './service/lesson.service.ts'
import { QuestionnaireService } from './service/questionnaire.service.ts'
import { TrackService } from './service/track.service.ts'

export interface AppDependencies {
  readonly tracks: TrackRepository
  readonly lessons: LessonRepository
  readonly exercises: ExerciseRepository
  readonly questionnaire: QuestionnaireRepository
  readonly placements: PlacementRepository
  readonly users: UserRepository
  readonly progress: ProgressRepository
  readonly certificates: CertificateRepository
  readonly contentSource: Config['CONTENT_SOURCE']
  /** Executions par minute et par adresse IP, toutes routes qui executent confondues. */
  readonly executionRateLimit: number
  /** Apprenants anonymes crees par minute et par adresse IP. */
  readonly learnerCreationRateLimit: number
  readonly isDatabaseUp: () => Promise<boolean>
}

export function buildApp(deps: AppDependencies): Express {
  const { tracks, lessons, exercises, questionnaire, placements, users, progress } = deps
  const certificates = new CertificateService(
    deps.certificates,
    users,
    progress,
    tracks,
    exercises,
  )
  const learners = new LearnerService(users, progress, tracks, exercises, placements, certificates)
  const app = express()
  secure(app)
  app.use(express.json({ limit: MAX_BODY_BYTES }))
  // Seules ces routes appellent le moteur : les lectures ne sont pas limitees.
  app.post(
    [
      '/api/v1/executions',
      '/api/v1/tracks/:track/chapters/:chapter/exercises/:exercise/verifications',
      '/api/v1/questionnaire/exercises/:questionId/verifications',
      '/api/v1/questionnaire/results',
    ],
    perMinuteLimiter(deps.executionRateLimit, MESSAGES.tooManyExecutions),
  )
  app.post(
    '/api/v1/learners',
    perMinuteLimiter(deps.learnerCreationRateLimit, MESSAGES.tooManyLearners),
  )

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
  app.use(
    '/api/v1',
    new ExerciseController(new ExerciseService(tracks, exercises), learners).buildRouter(),
  )
  app.use('/api/v1', new LearnerController(learners).buildRouter())
  app.use('/api/v1', new CertificateController(certificates).buildRouter())
  app.use(
    '/api/v1',
    new QuestionnaireController(
      new QuestionnaireService(questionnaire, tracks, placements),
      learners,
    ).buildRouter(),
  )

  app.use(routeNotFound)
  app.use(errorHandler)
  return app
}
