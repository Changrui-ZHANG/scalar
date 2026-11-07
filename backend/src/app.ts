import express from 'express'
import type { Express } from 'express'

import type { Config } from './config.ts'
import { MAX_BODY_BYTES, MESSAGES } from './constants.ts'
import { ExecutionController } from './controller/execution.controller.ts'
import { AdminContentController } from './controller/admin-content.controller.ts'
import { AuthController } from './controller/auth.controller.ts'
import { CertificateController } from './controller/certificate.controller.ts'
import { ExerciseController } from './controller/exercise.controller.ts'
import { LearnerController } from './controller/learner.controller.ts'
import { LessonController } from './controller/lesson.controller.ts'
import { QuestionnaireController } from './controller/questionnaire.controller.ts'
import { TrackController } from './controller/track.controller.ts'
import { errorHandler, routeNotFound } from './http/errors.ts'
import { learnerAccess } from './http/learner-access.ts'
import { requireAdmin } from './http/require-admin.ts'
import { perMinuteLimiter } from './http/rate-limit.ts'
import type { SessionSettings } from './http/require-auth.ts'
import { secure } from './http/security.ts'
import type { AdminContentRepository } from './repository/admin-content.repository.ts'
import type { CertificateRepository } from './repository/certificate.repository.ts'
import type { ExerciseRepository } from './repository/exercise.repository.ts'
import type { LessonRepository } from './repository/lesson.repository.ts'
import type { PlacementRepository } from './repository/placement.repository.ts'
import type { ProgressRepository } from './repository/progress.repository.ts'
import type { QuestionnaireRepository } from './repository/questionnaire.repository.ts'
import type { TrackRepository } from './repository/track.repository.ts'
import type { UserRepository } from './repository/user.repository.ts'
import { AdminContentService } from './service/admin-content.service.ts'
import { AuthService } from './service/auth.service.ts'
import { CertificateService } from './service/certificate.service.ts'
import { ExerciseService } from './service/exercise.service.ts'
import { LearnerService } from './service/learner.service.ts'
import { LessonService } from './service/lesson.service.ts'
import type { PasswordHasher } from './service/password-hasher.service.ts'
import { QuestionnaireService } from './service/questionnaire.service.ts'
import { SessionTokenService } from './service/session-token.service.ts'
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
  /** Tout le contenu, brouillons compris : servi sous /api/v1/admin seulement. */
  readonly adminContent: AdminContentRepository
  readonly contentSource: Config['CONTENT_SOURCE']
  /** Executions par minute et par adresse IP, toutes routes qui executent confondues. */
  readonly executionRateLimit: number
  /** Apprenants anonymes crees par minute et par adresse IP. */
  readonly learnerCreationRateLimit: number
  /** Connexions et inscriptions ratees par adresse IP et par email, sur 15 minutes. */
  readonly authAttemptsLimit: number
  readonly jwtSecret: string
  readonly secureCookie: boolean
  readonly hasher: PasswordHasher
  readonly isDatabaseUp: () => Promise<boolean>
}

export function buildApp(deps: AppDependencies): Express {
  const { tracks, lessons, exercises, questionnaire, placements, users, progress } = deps
  const certificates = new CertificateService(deps.certificates, users, progress, tracks, exercises)
  const learners = new LearnerService(users, progress, tracks, exercises, placements, certificates)
  const tokens = new SessionTokenService(deps.jwtSecret)
  const session: SessionSettings = {
    auth: new AuthService(users, deps.hasher, tokens),
    tokens,
    secureCookie: deps.secureCookie,
  }
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
  // Apres les limites de debit : un flot de requetes n'interroge pas la base pour chacune.
  app.use(
    ['/api/v1/learners/:learnerId/progress', '/api/v1/learners/:learnerId/certificates'],
    learnerAccess(session, learners, 'param'),
  )
  app.post(
    [
      '/api/v1/tracks/:track/chapters/:chapter/exercises/:exercise/verifications',
      '/api/v1/questionnaire/results',
    ],
    learnerAccess(session, learners, 'header'),
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

  // Avant tout routeur admin : aucune route d'administration n'echappe au controle du role.
  app.use('/api/v1/admin', requireAdmin(session))
  app.use(
    '/api/v1/admin',
    new AdminContentController(new AdminContentService(deps.adminContent)).buildRouter(),
  )
  app.use('/api/v1', new AuthController(session, deps.authAttemptsLimit).buildRouter())
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
    ).buildRouter(),
  )

  app.use(routeNotFound)
  app.use(errorHandler)
  return app
}
