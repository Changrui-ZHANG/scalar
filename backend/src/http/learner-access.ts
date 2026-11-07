import type { RequestHandler, Response } from 'express'

import { LEARNER_HEADER, MESSAGES } from '../constants.ts'
import type { LearnerService } from '../service/learner.service.ts'
import { fail, notFound } from './envelope.ts'
import { contentUnavailable } from './errors.ts'
import type { SessionSettings } from './require-auth.ts'
import { resolveSession } from './require-auth.ts'

/** L'apprenant de la requete, pose par `learnerAccess` ; undefined si elle n'en designe aucun. */
export function currentLearnerId(res: Response): string | undefined {
  return res.locals.learnerId as string | undefined
}

/**
 * `param` : l'apprenant de `:learnerId`, obligatoire.
 * `header` : celui de X-Learner-Id, sinon celui de la session, sinon aucun (essai non enregistre).
 */
export function learnerAccess(
  session: SessionSettings,
  learners: LearnerService,
  from: 'param' | 'header',
): RequestHandler<{ learnerId?: string }> {
  return async (req, res, next) => {
    try {
      const sessionUser = await resolveSession(session, req, res)
      const learnerId =
        from === 'param' ? req.params.learnerId : (req.get(LEARNER_HEADER) ?? sessionUser?.id)
      // Ni en-tete ni session : la verification a lieu, mais n'est rattachee a personne.
      if (learnerId === undefined) {
        next()
        return
      }
      switch (await learners.access(learnerId, sessionUser?.id ?? null)) {
        case 'not-found':
          notFound(res, MESSAGES.learnerNotFound)
          return
        case 'unauthenticated':
          fail(res, 401, MESSAGES.unauthenticated)
          return
        case 'forbidden':
          fail(res, 403, MESSAGES.forbidden)
          return
        default:
          res.locals.learnerId = learnerId
          next()
      }
    } catch (error: unknown) {
      contentUnavailable(res, error)
    }
  }
}
