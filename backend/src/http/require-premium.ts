import type { RequestHandler } from 'express'

import { MESSAGES } from '../constants.ts'
import type { TrackRepository } from '../repository/track.repository.ts'
import type { PremiumService } from '../service/premium.service.ts'
import { rank } from '../service/track.service.ts'
import { fail } from './envelope.ts'
import { contentUnavailable } from './errors.ts'
import type { SessionSettings } from './require-auth.ts'
import { resolveSession } from './require-auth.ts'

/** Faux pour un chapitre introuvable : son 404 vient ensuite, du controleur. */
export async function isChapterLocked(
  tracks: TrackRepository,
  premium: PremiumService,
  trackSlug: string,
  chapterSlug: string,
  userId: string | null,
): Promise<boolean> {
  const track = await tracks.findTrackBySlug(trackSlug)
  const chapter = track && (await tracks.findChapter(track.id, chapterSlug))
  if (!track || !chapter) {
    return false
  }
  if (premium.isFreeChapter(rank(await tracks.listChapters(track.id), chapter))) {
    return false
  }
  return !(await premium.isPremium(userId))
}

/** 403 sur un chapitre au-dela du seuil gratuit, sauf Premium. */
export function requirePremiumChapter(
  session: SessionSettings,
  tracks: TrackRepository,
  premium: PremiumService,
): RequestHandler<{ track: string; chapter: string }> {
  return async (req, res, next) => {
    try {
      // La session n'est lue que pour un chapitre Premium : le contenu gratuit n'en a pas besoin.
      const locked = await isChapterLocked(
        tracks,
        premium,
        req.params.track,
        req.params.chapter,
        null,
      )
      if (!locked) {
        next()
        return
      }
      const user = await resolveSession(session, req, res)
      if (
        await isChapterLocked(
          tracks,
          premium,
          req.params.track,
          req.params.chapter,
          user?.id ?? null,
        )
      ) {
        fail(res, 403, MESSAGES.premiumRequired)
        return
      }
      next()
    } catch (error: unknown) {
      contentUnavailable(res, error)
    }
  }
}
