import type { PrismaClient } from '@prisma/client'

import { ORDER_BY_POSITION, PUBLISHED } from '../constants.ts'
import type { Chapter } from '../entity/chapter.entity.ts'
import type { Track } from '../entity/track.entity.ts'
import { toChapter, toTrack } from './prisma.mapper.ts'
import type { TrackRepository } from './track.repository.ts'

export class PrismaTrackRepository implements TrackRepository {
  private readonly prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  async listTracks(): Promise<Track[]> {
    const rows = await this.prisma.track.findMany({
      where: { status: PUBLISHED },
      orderBy: ORDER_BY_POSITION,
    })
    return rows.map(toTrack)
  }

  async findTrackBySlug(slug: string): Promise<Track | null> {
    const row = await this.prisma.track.findFirst({ where: { slug, status: PUBLISHED } })
    return row && toTrack(row)
  }

  async listChapters(trackId: number): Promise<Chapter[]> {
    const rows = await this.prisma.chapter.findMany({
      where: { trackId, status: PUBLISHED },
      // Un enum PostgreSQL se trie dans l'ordre de declaration de ses valeurs.
      orderBy: [{ level: 'asc' }, ORDER_BY_POSITION],
    })
    return rows.map(toChapter)
  }

  async findChapter(trackId: number, slug: string): Promise<Chapter | null> {
    const row = await this.prisma.chapter.findFirst({ where: { trackId, slug, status: PUBLISHED } })
    return row && toChapter(row)
  }
}
