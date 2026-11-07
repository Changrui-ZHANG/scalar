import { Prisma } from '@prisma/client'
import type { PrismaClient } from '@prisma/client'
import type { ChapterLevel } from '@scalar/shared/enums'

import { ORDER_BY_POSITION } from '../constants.ts'
import type { Chapter } from '../entity/chapter.entity.ts'
import type { Track } from '../entity/track.entity.ts'
import type {
  AdminContentRepository,
  ChapterChanges,
  ChapterInput,
  DeleteOutcome,
  SaveOutcome,
  TrackChanges,
  TrackInput,
} from './admin-content.repository.ts'
import { toChapter, toTrack } from './prisma.mapper.ts'

type Transaction = Prisma.TransactionClient

const errorCode = (error: unknown): string | null => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code
  }
  // ON DELETE RESTRICT leve 23001 (restrict_violation), que Prisma ne traduit pas en code P.
  if (
    error instanceof Prisma.PrismaClientUnknownRequestError &&
    /code: "23001"/.test(error.message)
  ) {
    return '23001'
  }
  return null
}

// P2002 : unicite (slug) ; P2003 : cle etrangere (prerequis ou parcours absent) ; P2025 : aucune ligne visee.
async function save<T>(write: () => Promise<T>): Promise<SaveOutcome<T>> {
  try {
    return { status: 'saved', item: await write() }
  } catch (error: unknown) {
    switch (errorCode(error)) {
      case 'P2002':
        return { status: 'slug-taken' }
      case 'P2003':
        return { status: 'prerequisite-not-found' }
      case 'P2025':
        return { status: 'not-found' }
      default:
        throw error
    }
  }
}

// 23001 : une ligne en depend encore (chapitre, lecon, exercice, certificat, positionnement).
async function remove(write: () => Promise<unknown>): Promise<DeleteOutcome> {
  try {
    await write()
    return 'deleted'
  } catch (error: unknown) {
    switch (errorCode(error)) {
      case '23001':
      case 'P2003':
        return 'in-use'
      case 'P2025':
        return 'not-found'
      default:
        throw error
    }
  }
}

async function nextChapterPosition(
  tx: Transaction,
  trackId: number,
  level: ChapterLevel,
): Promise<number> {
  const { _max } = await tx.chapter.aggregate({
    where: { trackId, level },
    _max: { position: true },
  })
  return (_max.position ?? 0) + 1
}

export class PrismaAdminContentRepository implements AdminContentRepository {
  private readonly prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  async listTracks(): Promise<Track[]> {
    return (await this.prisma.track.findMany({ orderBy: ORDER_BY_POSITION })).map(toTrack)
  }

  async findTrack(id: number): Promise<Track | null> {
    const row = await this.prisma.track.findUnique({ where: { id } })
    return row && toTrack(row)
  }

  async createTrack(input: TrackInput): Promise<SaveOutcome<Track>> {
    return save(() =>
      this.prisma.$transaction(async (tx) => {
        const { _max } = await tx.track.aggregate({ _max: { position: true } })
        return toTrack(
          await tx.track.create({ data: { ...input, position: (_max.position ?? 0) + 1 } }),
        )
      }),
    )
  }

  async updateTrack(id: number, changes: TrackChanges): Promise<SaveOutcome<Track>> {
    return save(async () =>
      toTrack(await this.prisma.track.update({ where: { id }, data: changes })),
    )
  }

  async deleteTrack(id: number): Promise<DeleteOutcome> {
    return remove(() => this.prisma.track.delete({ where: { id } }))
  }

  async listChapters(trackId: number): Promise<Chapter[]> {
    const rows = await this.prisma.chapter.findMany({
      where: { trackId },
      // Un enum PostgreSQL se trie dans l'ordre de declaration de ses valeurs.
      orderBy: [{ level: 'asc' }, ORDER_BY_POSITION],
    })
    return rows.map(toChapter)
  }

  async findChapter(trackId: number, id: number): Promise<Chapter | null> {
    const row = await this.prisma.chapter.findUnique({ where: { id, trackId } })
    return row && toChapter(row)
  }

  async createChapter(trackId: number, input: ChapterInput): Promise<SaveOutcome<Chapter>> {
    const outcome = await save(() =>
      this.prisma.$transaction(async (tx) => {
        const position = await nextChapterPosition(tx, trackId, input.level)
        return toChapter(await tx.chapter.create({ data: { ...input, trackId, position } }))
      }),
    )
    // Ici, la seule cle etrangere est le parcours.
    return outcome.status === 'prerequisite-not-found' ? { status: 'not-found' } : outcome
  }

  async updateChapter(
    trackId: number,
    id: number,
    changes: ChapterChanges,
  ): Promise<SaveOutcome<Chapter>> {
    return save(() =>
      this.prisma.$transaction(async (tx) => {
        const current = await tx.chapter.findUniqueOrThrow({ where: { id, trackId } })
        const moved = changes.level !== undefined && changes.level !== current.level
        const position = moved
          ? await nextChapterPosition(tx, trackId, changes.level!)
          : current.position
        return toChapter(await tx.chapter.update({ where: { id }, data: { ...changes, position } }))
      }),
    )
  }

  async deleteChapter(trackId: number, id: number): Promise<DeleteOutcome> {
    return remove(() => this.prisma.chapter.delete({ where: { id, trackId } }))
  }
}
