import type { RequestHandler } from 'express'

import { MESSAGES } from '../constants.ts'
import type { TrackRepository } from '../repository/track.repository.ts'
import type { PremiumService } from '../service/premium.service.ts'
import { rank } from '../service/track.service.ts'
import { fail } from './envelope.ts'
import { contentUnavailable } from './errors.ts'
import type { SessionSettings } from './require-auth.ts'
import { resolveSession } from './require-auth.ts'

/** 403 sur un chapitre au-dela du seuil gratuit, sauf Premium ; un chapitre introuvable passe, pour son 404. */
export function requirePremiumChapter(
  session: SessionSettings,
  tracks: TrackRepository,
  premium: PremiumService,
): RequestHandler<{ track: string; chapter: string }> {
  return async (req, res, next) => {
    try {
      const track = await tracks.findTrackBySlug(req.params.track)
      const chapter = track && (await tracks.findChapter(track.id, req.params.chapter))
      if (!track || !chapter) {
        next()
        return
      }
      if (premium.isFreeChapter(rank(await tracks.listChapters(track.id), chapter))) {
        next()
        return
      }
      const user = await resolveSession(session, req, res)
      if (!(await premium.isPremium(user?.id ?? null))) {
        fail(res, 403, MESSAGES.premiumRequired)
        return
      }
      next()
    } catch (error: unknown) {
      contentUnavailable(res, error)
    }
  }
}
