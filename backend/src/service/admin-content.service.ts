import { CHAPTER_LEVELS, PROGRAMMING_LANGUAGES, PUBLICATION_STATUSES } from '@scalar/shared/enums'
import { z } from 'zod'

import { MESSAGES, SLUG_PATTERN } from '../constants.ts'
import type { Chapter } from '../entity/chapter.entity.ts'
import type { Track } from '../entity/track.entity.ts'
import type {
  AdminContentRepository,
  DeleteOutcome,
} from '../repository/admin-content.repository.ts'

export type Refusal =
  | 'not-found'
  | 'slug-taken'
  | 'slug-locked'
  | 'prerequisite-not-found'
  | 'own-prerequisite'
  | 'published-once'
  | 'in-use'

export type AdminOutcome<T> =
  | { readonly status: 'saved'; readonly item: T }
  | { readonly status: 'deleted' }
  | { readonly status: 'invalid'; readonly error: string }
  | { readonly status: Refusal }

const slug = z.string().regex(SLUG_PATTERN).max(64)
const text = (max: number) => z.string().trim().min(1).max(max)
const status = z.enum(PUBLICATION_STATUSES)

const trackFields = {
  slug,
  name: text(100),
  summary: text(500),
  programmingLanguage: z.enum(PROGRAMMING_LANGUAGES).nullable(),
  prerequisiteTrackId: z.int().positive().nullable(),
}
// Strict : une faute de frappe dans un nom de champ est refusee, pas ignoree en silence.
const newTrack = z.strictObject({
  ...trackFields,
  programmingLanguage: trackFields.programmingLanguage.default(null),
  prerequisiteTrackId: trackFields.prerequisiteTrackId.default(null),
})
const trackChanges = z.strictObject(trackFields).partial().extend({ status: status.optional() })

const chapterFields = {
  slug,
  level: z.enum(CHAPTER_LEVELS),
  title: text(100),
  summary: text(500),
}
const newChapter = z.strictObject(chapterFields)
const chapterChanges = z.strictObject(chapterFields).partial().extend({ status: status.optional() })

type Parsed<T> =
  { ok: true; data: T } | { ok: false; outcome: { status: 'invalid'; error: string } }

function parse<T>(schema: z.ZodType<T>, body: unknown): Parsed<T> {
  const parsed = schema.safeParse(body ?? {})
  if (parsed.success) {
    return { ok: true, data: parsed.data }
  }
  const issue = parsed.error.issues[0]
  const field = issue?.code === 'unrecognized_keys' ? issue.keys.join(', ') : issue?.path.join('.')
  const error = field ? `${MESSAGES.invalidField} ${field}.` : MESSAGES.invalidRequest
  return { ok: false, outcome: { status: 'invalid', error } }
}

const fromDelete = (outcome: DeleteOutcome): AdminOutcome<never> =>
  outcome === 'deleted' ? { status: 'deleted' } : { status: outcome }

interface Published {
  readonly slug: string
  readonly firstPublishedAt: Date | null
}

/** Refus commun : slug fige une fois publie. Sinon, date de premiere publication a poser. */
function publication(
  current: Published,
  changes: { slug?: string; status?: string },
  now: Date,
): { refusal: 'slug-locked' } | { firstPublishedAt?: Date } {
  if (changes.slug !== undefined && changes.slug !== current.slug && current.firstPublishedAt) {
    return { refusal: 'slug-locked' }
  }
  return changes.status === 'published' && !current.firstPublishedAt
    ? { firstPublishedAt: now }
    : {}
}

export class AdminContentService {
  private readonly content: AdminContentRepository
  private readonly now: () => Date

  constructor(content: AdminContentRepository, now: () => Date = () => new Date()) {
    this.content = content
    this.now = now
  }

  listTracks(): Promise<readonly Track[]> {
    return this.content.listTracks()
  }

  findTrack(id: number): Promise<Track | null> {
    return this.content.findTrack(id)
  }

  async createTrack(body: unknown): Promise<AdminOutcome<Track>> {
    const parsed = parse(newTrack, body)
    return parsed.ok ? this.content.createTrack(parsed.data) : parsed.outcome
  }

  async updateTrack(id: number, body: unknown): Promise<AdminOutcome<Track>> {
    const parsed = parse(trackChanges, body)
    if (!parsed.ok) {
      return parsed.outcome
    }
    const current = await this.content.findTrack(id)
    if (!current) {
      return { status: 'not-found' }
    }
    if (parsed.data.prerequisiteTrackId === id) {
      return { status: 'own-prerequisite' }
    }
    const published = publication(current, parsed.data, this.now())
    if ('refusal' in published) {
      return { status: published.refusal }
    }
    return this.content.updateTrack(id, { ...parsed.data, ...published })
  }

  async deleteTrack(id: number): Promise<AdminOutcome<never>> {
    const current = await this.content.findTrack(id)
    if (current?.firstPublishedAt) {
      return { status: 'published-once' }
    }
    return fromDelete(await this.content.deleteTrack(id))
  }

  async listChapters(trackId: number): Promise<readonly Chapter[] | null> {
    return (await this.content.findTrack(trackId)) ? this.content.listChapters(trackId) : null
  }

  findChapter(trackId: number, id: number): Promise<Chapter | null> {
    return this.content.findChapter(trackId, id)
  }

  async createChapter(trackId: number, body: unknown): Promise<AdminOutcome<Chapter>> {
    const parsed = parse(newChapter, body)
    return parsed.ok ? this.content.createChapter(trackId, parsed.data) : parsed.outcome
  }

  async updateChapter(trackId: number, id: number, body: unknown): Promise<AdminOutcome<Chapter>> {
    const parsed = parse(chapterChanges, body)
    if (!parsed.ok) {
      return parsed.outcome
    }
    const current = await this.content.findChapter(trackId, id)
    if (!current) {
      return { status: 'not-found' }
    }
    const published = publication(current, parsed.data, this.now())
    if ('refusal' in published) {
      return { status: published.refusal }
    }
    return this.content.updateChapter(trackId, id, { ...parsed.data, ...published })
  }

  async deleteChapter(trackId: number, id: number): Promise<AdminOutcome<never>> {
    const current = await this.content.findChapter(trackId, id)
    if (current?.firstPublishedAt) {
      return { status: 'published-once' }
    }
    return fromDelete(await this.content.deleteChapter(trackId, id))
  }
}
