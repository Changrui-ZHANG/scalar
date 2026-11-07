import { beforeEach, describe, expect, it } from 'vitest'

import { chapter, track } from '../content.fixtures.ts'
import { MESSAGES } from '../../../backend/src/constants.ts'
import { InMemoryAdminContentRepository } from '../../../backend/src/repository/admin-content.repository.ts'
import { AdminContentService } from '../../../backend/src/service/admin-content.service.ts'

const NOW = new Date('2026-11-08T10:00:00Z')
const PUBLISHED = track(1, 'javascript', 1)
const DRAFT = track(2, 'rust', 2, { status: 'draft', firstPublishedAt: null })
const PUBLISHED_CHAPTER = chapter(10, 1, 'boucles', 'beginner', 1)
const DRAFT_CHAPTER = chapter(11, 1, 'modules', 'beginner', 2, {
  status: 'draft',
  firstPublishedAt: null,
})

const NEW_TRACK = { slug: 'python', name: 'Python', summary: 'Le serpent.' }
const NEW_CHAPTER = { slug: 'listes', level: 'beginner', title: 'Listes', summary: 'Des listes.' }

let service: AdminContentService

beforeEach(() => {
  service = new AdminContentService(
    new InMemoryAdminContentRepository([PUBLISHED, DRAFT], [PUBLISHED_CHAPTER, DRAFT_CHAPTER], []),
    () => NOW,
  )
})

describe('AdminContentService : parcours', () => {
  it('crée en brouillon, à la fin, sans langage ni prérequis par défaut', async () => {
    expect(await service.createTrack(NEW_TRACK)).toMatchObject({
      status: 'saved',
      item: {
        ...NEW_TRACK,
        position: 3,
        status: 'draft',
        firstPublishedAt: null,
        programmingLanguage: null,
        prerequisiteTrackId: null,
      },
    })
  })

  it.each([
    ['un slug avec majuscule', { ...NEW_TRACK, slug: 'Python' }, 'slug'],
    ['un nom vide', { ...NEW_TRACK, name: '   ' }, 'name'],
    ['un champ inconnu', { ...NEW_TRACK, statut: 'published' }, 'statut'],
    ['un statut imposé à la création', { ...NEW_TRACK, status: 'published' }, 'status'],
    ['un langage inconnu', { ...NEW_TRACK, programmingLanguage: 'cobol' }, 'programmingLanguage'],
  ])('refuse %s en nommant le champ', async (_name, body, field) => {
    expect(await service.createTrack(body)).toEqual({
      status: 'invalid',
      error: `${MESSAGES.invalidField} ${field}.`,
    })
  })

  it('refuse un corps absent', async () => {
    expect(await service.createTrack(undefined)).toMatchObject({ status: 'invalid' })
  })

  it('date la première publication, et seulement elle', async () => {
    const first = await service.updateTrack(DRAFT.id, { status: 'published' })
    expect(first).toMatchObject({ item: { status: 'published', firstPublishedAt: NOW } })

    await service.updateTrack(DRAFT.id, { status: 'archived' })
    const again = await service.updateTrack(DRAFT.id, { status: 'published' })
    expect(again).toMatchObject({ item: { firstPublishedAt: NOW } })
    expect((await service.updateTrack(PUBLISHED.id, { status: 'draft' })).status).toBe('saved')
    expect((await service.findTrack(PUBLISHED.id))?.firstPublishedAt).toEqual(
      PUBLISHED.firstPublishedAt,
    )
  })

  it('fige le slug d’un parcours déjà publié, mais accepte de le renvoyer inchangé', async () => {
    expect(await service.updateTrack(PUBLISHED.id, { slug: 'js' })).toEqual({
      status: 'slug-locked',
    })
    expect((await service.updateTrack(PUBLISHED.id, { slug: 'javascript' })).status).toBe('saved')
    expect(await service.updateTrack(DRAFT.id, { slug: 'rust-lang' })).toMatchObject({
      item: { slug: 'rust-lang' },
    })
  })

  it('refuse un parcours prérequis de lui-même, ou inconnu', async () => {
    expect(await service.updateTrack(DRAFT.id, { prerequisiteTrackId: DRAFT.id })).toEqual({
      status: 'own-prerequisite',
    })
    expect(await service.updateTrack(DRAFT.id, { prerequisiteTrackId: 99 })).toEqual({
      status: 'prerequisite-not-found',
    })
    expect(
      await service.updateTrack(DRAFT.id, { prerequisiteTrackId: PUBLISHED.id }),
    ).toMatchObject({ item: { prerequisiteTrackId: PUBLISHED.id } })
  })

  it('refuse un slug déjà pris et un parcours inconnu', async () => {
    expect(await service.updateTrack(DRAFT.id, { slug: 'javascript' })).toEqual({
      status: 'slug-taken',
    })
    expect(await service.updateTrack(99, { name: 'X' })).toEqual({ status: 'not-found' })
  })

  it('ne supprime jamais un parcours déjà publié, ni un parcours qui a des chapitres', async () => {
    expect(await service.deleteTrack(PUBLISHED.id)).toEqual({ status: 'published-once' })

    const created = await service.createTrack(NEW_TRACK)
    if (created.status !== 'saved') {
      throw new Error(created.status)
    }
    await service.createChapter(created.item.id, NEW_CHAPTER)
    expect(await service.deleteTrack(created.item.id)).toEqual({ status: 'in-use' })
    expect(await service.deleteTrack(DRAFT.id)).toEqual({ status: 'deleted' })
    expect(await service.deleteTrack(DRAFT.id)).toEqual({ status: 'not-found' })
  })
})

describe('AdminContentService : chapitres', () => {
  it('liste les brouillons, et null pour un parcours inconnu', async () => {
    expect((await service.listChapters(PUBLISHED.id))?.map((c) => c.slug)).toEqual([
      'boucles',
      'modules',
    ])
    expect(await service.listChapters(99)).toBeNull()
  })

  it('crée en brouillon à la fin de son niveau', async () => {
    expect(await service.createChapter(PUBLISHED.id, NEW_CHAPTER)).toMatchObject({
      item: { position: 3, status: 'draft', trackId: PUBLISHED.id },
    })
    expect(
      await service.createChapter(PUBLISHED.id, { ...NEW_CHAPTER, slug: 'tas', level: 'advanced' }),
    ).toMatchObject({ item: { position: 1 } })
  })

  it('refuse un slug déjà pris dans le parcours, et un parcours inconnu', async () => {
    expect(await service.createChapter(PUBLISHED.id, { ...NEW_CHAPTER, slug: 'boucles' })).toEqual({
      status: 'slug-taken',
    })
    expect(await service.createChapter(99, NEW_CHAPTER)).toEqual({ status: 'not-found' })
  })

  it('replace à la fin de son nouveau niveau un chapitre qui en change', async () => {
    await service.createChapter(PUBLISHED.id, { ...NEW_CHAPTER, slug: 'tas', level: 'advanced' })

    expect(
      await service.updateChapter(PUBLISHED.id, DRAFT_CHAPTER.id, { level: 'advanced' }),
    ).toMatchObject({ item: { level: 'advanced', position: 2 } })
  })

  it('fige le slug d’un chapitre publié et date sa première publication', async () => {
    expect(
      await service.updateChapter(PUBLISHED.id, PUBLISHED_CHAPTER.id, { slug: 'for' }),
    ).toEqual({ status: 'slug-locked' })
    expect(
      await service.updateChapter(PUBLISHED.id, DRAFT_CHAPTER.id, { status: 'published' }),
    ).toMatchObject({ item: { firstPublishedAt: NOW } })
  })

  it('ne trouve pas un chapitre par un autre parcours que le sien', async () => {
    expect(await service.findChapter(DRAFT.id, PUBLISHED_CHAPTER.id)).toBeNull()
    expect(await service.updateChapter(DRAFT.id, DRAFT_CHAPTER.id, { title: 'X' })).toEqual({
      status: 'not-found',
    })
    expect(await service.deleteChapter(DRAFT.id, DRAFT_CHAPTER.id)).toEqual({
      status: 'not-found',
    })
  })

  it('supprime un brouillon jamais publié, jamais un chapitre déjà publié', async () => {
    expect(await service.deleteChapter(PUBLISHED.id, PUBLISHED_CHAPTER.id)).toEqual({
      status: 'published-once',
    })
    expect(await service.deleteChapter(PUBLISHED.id, DRAFT_CHAPTER.id)).toEqual({
      status: 'deleted',
    })
  })
})
