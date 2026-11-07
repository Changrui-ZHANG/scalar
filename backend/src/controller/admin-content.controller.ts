import { Router } from 'express'
import type { Request, Response } from 'express'

import { MESSAGES } from '../constants.ts'
import { badRequest, fail, notFound, ok } from '../http/envelope.ts'
import { contentUnavailable } from '../http/errors.ts'
import type {
  AdminContentService,
  AdminOutcome,
  Refusal,
} from '../service/admin-content.service.ts'

type Params = { trackId?: string; chapterId?: string }

// Plafond d'une colonne INT PostgreSQL : au-dela, Prisma leverait au lieu de ne rien trouver.
const MAX_ID = 2_147_483_647

/** Null pour un id qui ne peut designer aucune ligne : la route repond alors 404. */
const toId = (raw: string | undefined): number | null => {
  const id = /^[1-9]\d{0,9}$/.test(raw ?? '') ? Number(raw) : NaN
  return id <= MAX_ID ? id : null
}

const REFUSALS: Record<Exclude<Refusal, 'not-found'>, readonly [number, string]> = {
  'slug-taken': [409, MESSAGES.slugTaken],
  'slug-locked': [409, MESSAGES.slugLocked],
  'published-once': [409, MESSAGES.publishedNotDeletable],
  'in-use': [409, MESSAGES.contentInUse],
  'prerequisite-not-found': [400, MESSAGES.prerequisiteNotFound],
  'own-prerequisite': [400, MESSAGES.ownPrerequisite],
}

export class AdminContentController {
  private readonly service: AdminContentService

  constructor(service: AdminContentService) {
    this.service = service
  }

  buildRouter() {
    const router = Router()
    router.get('/tracks', (_req, res) => this.read(res, '', () => this.service.listTracks()))
    router.post('/tracks', (req, res) =>
      this.write(res, MESSAGES.trackNotFound, () => this.service.createTrack(req.body), 201),
    )
    router.get('/tracks/:trackId', (req: Request<Params>, res) =>
      this.withIds(req, res, MESSAGES.trackNotFound, ([trackId]) =>
        this.read(res, MESSAGES.trackNotFound, () => this.service.findTrack(trackId)),
      ),
    )
    router.patch('/tracks/:trackId', (req: Request<Params>, res) =>
      this.withIds(req, res, MESSAGES.trackNotFound, ([trackId]) =>
        this.write(res, MESSAGES.trackNotFound, () => this.service.updateTrack(trackId, req.body)),
      ),
    )
    router.delete('/tracks/:trackId', (req: Request<Params>, res) =>
      this.withIds(req, res, MESSAGES.trackNotFound, ([trackId]) =>
        this.write(res, MESSAGES.trackNotFound, () => this.service.deleteTrack(trackId)),
      ),
    )
    router.get('/tracks/:trackId/chapters', (req: Request<Params>, res) =>
      this.withIds(req, res, MESSAGES.trackNotFound, ([trackId]) =>
        this.read(res, MESSAGES.trackNotFound, () => this.service.listChapters(trackId)),
      ),
    )
    router.post('/tracks/:trackId/chapters', (req: Request<Params>, res) =>
      this.withIds(req, res, MESSAGES.trackNotFound, ([trackId]) =>
        this.write(
          res,
          MESSAGES.trackNotFound,
          () => this.service.createChapter(trackId, req.body),
          201,
        ),
      ),
    )
    router.get('/tracks/:trackId/chapters/:chapterId', (req: Request<Params>, res) =>
      this.withIds(req, res, MESSAGES.chapterNotFound, ([trackId, chapterId]) =>
        this.read(res, MESSAGES.chapterNotFound, () =>
          this.service.findChapter(trackId, chapterId!),
        ),
      ),
    )
    router.patch('/tracks/:trackId/chapters/:chapterId', (req: Request<Params>, res) =>
      this.withIds(req, res, MESSAGES.chapterNotFound, ([trackId, chapterId]) =>
        this.write(res, MESSAGES.chapterNotFound, () =>
          this.service.updateChapter(trackId, chapterId!, req.body),
        ),
      ),
    )
    router.delete('/tracks/:trackId/chapters/:chapterId', (req: Request<Params>, res) =>
      this.withIds(req, res, MESSAGES.chapterNotFound, ([trackId, chapterId]) =>
        this.write(res, MESSAGES.chapterNotFound, () =>
          this.service.deleteChapter(trackId, chapterId!),
        ),
      ),
    )
    return router
  }

  /** Les ids presents dans l'URL, dans l'ordre ; 404 si l'un d'eux est mal forme. */
  private async withIds(
    req: Request<Params>,
    res: Response,
    notFoundMessage: string,
    handle: (ids: [number, number?]) => Promise<void>,
  ): Promise<void> {
    const raw = [req.params.trackId, req.params.chapterId].filter((p) => p !== undefined)
    const ids = raw.map(toId)
    if (ids.some((id) => id === null)) {
      notFound(res, notFoundMessage)
      return
    }
    await handle(ids as [number, number?])
  }

  private async read<T>(
    res: Response,
    notFoundMessage: string,
    load: () => Promise<T | null>,
  ): Promise<void> {
    try {
      const data = await load()
      if (data === null) {
        notFound(res, notFoundMessage)
        return
      }
      ok(res, data)
    } catch (error: unknown) {
      contentUnavailable(res, error)
    }
  }

  private async write<T>(
    res: Response,
    notFoundMessage: string,
    run: () => Promise<AdminOutcome<T>>,
    successStatus = 200,
  ): Promise<void> {
    try {
      const outcome = await run()
      switch (outcome.status) {
        case 'saved':
          res.status(successStatus)
          ok(res, outcome.item)
          return
        case 'deleted':
          res.status(204).end()
          return
        case 'invalid':
          badRequest(res, outcome.error)
          return
        case 'not-found':
          notFound(res, notFoundMessage)
          return
        default: {
          const [status, message] = REFUSALS[outcome.status]
          fail(res, status, message)
        }
      }
    } catch (error: unknown) {
      contentUnavailable(res, error)
    }
  }
}
