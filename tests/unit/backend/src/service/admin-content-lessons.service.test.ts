import { MAX_LESSON_BODY_LENGTH, MAX_LESSON_TITLE_LENGTH } from '@scalar/shared/limits'
import { beforeEach, describe, expect, it } from 'vitest'

import { chapter, lesson, track } from '../../../../fixtures/backend/content.fixtures.ts'
import { MESSAGES } from '../../../../../backend/src/constants.ts'
import { InMemoryAdminContentRepository } from '../../../../../backend/src/repository/admin-content.repository.ts'
import type { AdminOutcome } from '../../../../../backend/src/service/admin-content.service.ts'
import { AdminContentService } from '../../../../../backend/src/service/admin-content.service.ts'

const NOW = new Date('2026-11-16T10:00:00Z')
const REVIEWED = new Date('2026-09-01T00:00:00Z')
const CHAPTER = 10
const EMPTY_CHAPTER = 11
const LIVE = 200
const DRAFT = 201
const NEW_LESSON = {
  slug: 'boucle-for',
  title: 'La boucle for',
  summary: 'Répéter un nombre connu de fois.',
  body: '## for\n\n```js\nfor (let i = 0; i < 3; i++) {}\n```',
}

const saved = <T>(outcome: AdminOutcome<T>): T => {
  if (outcome.status !== 'saved') {
    throw new Error(outcome.status)
  }
  return outcome.item
}

let service: AdminContentService

beforeEach(() => {
  const repository = new InMemoryAdminContentRepository(
    [track(1, 'javascript', 1)],
    [
      chapter(CHAPTER, 1, 'boucles', 'beginner', 1),
      chapter(EMPTY_CHAPTER, 1, 'vide', 'beginner', 2),
    ],
    [
      lesson(LIVE, CHAPTER, 'en-ligne', 1, { lastReviewedAt: REVIEWED }),
      lesson(DRAFT, CHAPTER, 'brouillon', 2, { status: 'draft', firstPublishedAt: null }),
    ],
    [],
    [],
  )
  service = new AdminContentService(repository, () => NOW)
})

describe('AdminContentService : lecture des leçons', () => {
  it('liste les leçons d’un chapitre par position, brouillons compris', async () => {
    const listed = await service.listLessons(CHAPTER)

    expect(listed?.map((l) => [l.slug, l.status])).toEqual([
      ['en-ligne', 'published'],
      ['brouillon', 'draft'],
    ])
    expect(await service.listLessons(EMPTY_CHAPTER)).toEqual([])
  })

  it('ne liste rien pour un chapitre inconnu, ne trouve pas une leçon inconnue', async () => {
    expect(await service.listLessons(99)).toBeNull()
    expect(await service.findLesson(99)).toBeNull()
    expect(await service.findLesson(DRAFT)).toMatchObject({ slug: 'brouillon' })
  })
})

describe('AdminContentService : création d’une leçon', () => {
  it('crée en brouillon, à la fin du chapitre, cours daté comme relu', async () => {
    expect(saved(await service.createLesson(CHAPTER, NEW_LESSON))).toMatchObject({
      ...NEW_LESSON,
      chapterId: CHAPTER,
      position: 3,
      status: 'draft',
      firstPublishedAt: null,
      lastReviewedAt: NOW,
    })
    expect(saved(await service.createLesson(EMPTY_CHAPTER, NEW_LESSON)).position).toBe(1)
  })

  it.each([
    ['un slug invalide', { slug: 'Mauvais Slug' }, 'slug'],
    ['un titre vide', { title: '   ' }, 'title'],
    ['un titre trop long', { title: 'x'.repeat(MAX_LESSON_TITLE_LENGTH + 1) }, 'title'],
    ['un cours absent', { body: undefined }, 'body'],
    ['un cours trop long', { body: 'x'.repeat(MAX_LESSON_BODY_LENGTH + 1) }, 'body'],
    ['un champ inconnu', { titre: 'X' }, 'titre'],
    ['un statut imposé à la création', { status: 'published' }, 'status'],
    ['une date de relecture imposée', { lastReviewedAt: NOW.toISOString() }, 'lastReviewedAt'],
  ])('refuse %s en nommant le champ', async (_name, extra, field) => {
    expect(await service.createLesson(CHAPTER, { ...NEW_LESSON, ...extra })).toEqual({
      status: 'invalid',
      error: `${MESSAGES.invalidField} ${field}.`,
    })
  })

  it('refuse un chapitre inconnu et un slug déjà pris dans le chapitre', async () => {
    expect(await service.createLesson(99, NEW_LESSON)).toEqual({ status: 'not-found' })
    expect(await service.createLesson(CHAPTER, { ...NEW_LESSON, slug: 'en-ligne' })).toEqual({
      status: 'slug-taken',
    })
  })

  it('accepte un slug déjà pris dans un autre chapitre', async () => {
    expect(
      saved(await service.createLesson(EMPTY_CHAPTER, { ...NEW_LESSON, slug: 'en-ligne' })),
    ).toMatchObject({ slug: 'en-ligne', chapterId: EMPTY_CHAPTER })
  })
})

describe('AdminContentService : modification d’une leçon', () => {
  it('laisse corriger le cours d’une leçon publiée, qui reste publiée, et date la relecture', async () => {
    expect(saved(await service.updateLesson(LIVE, { body: 'Cours corrigé.' }))).toMatchObject({
      body: 'Cours corrigé.',
      status: 'published',
      lastReviewedAt: NOW,
    })
  })

  it('ne date pas la relecture pour un titre, un résumé, ou un cours renvoyé à l’identique', async () => {
    const current = (await service.findLesson(LIVE))!

    const updated = saved(
      await service.updateLesson(LIVE, { title: 'Titre', summary: 'Résumé.', body: current.body }),
    )

    expect(updated).toMatchObject({ title: 'Titre', summary: 'Résumé.', lastReviewedAt: REVIEWED })
  })

  it('publie un brouillon et date la première publication, une seule fois', async () => {
    expect(saved(await service.updateLesson(DRAFT, { status: 'published' }))).toMatchObject({
      status: 'published',
      firstPublishedAt: NOW,
    })

    const first = (await service.findLesson(LIVE))!.firstPublishedAt
    await service.updateLesson(LIVE, { status: 'archived' })
    const republished = saved(await service.updateLesson(LIVE, { status: 'published' }))
    expect(republished.firstPublishedAt).toEqual(first)
  })

  it('laisse changer le slug d’un brouillon, le fige une fois publiée', async () => {
    expect(saved(await service.updateLesson(DRAFT, { slug: 'renomme' })).slug).toBe('renomme')
    expect(await service.updateLesson(LIVE, { slug: 'autre' })).toEqual({ status: 'slug-locked' })
  })

  it('refuse une leçon inconnue, un champ inconnu, un slug déjà pris, un cours vide', async () => {
    expect(await service.updateLesson(99, { title: 'X' })).toEqual({ status: 'not-found' })
    expect(await service.updateLesson(DRAFT, { titre: 'X' })).toEqual({
      status: 'invalid',
      error: `${MESSAGES.invalidField} titre.`,
    })
    expect(await service.updateLesson(DRAFT, { slug: 'en-ligne' })).toEqual({
      status: 'slug-taken',
    })
    expect(await service.updateLesson(DRAFT, { body: '  ' })).toMatchObject({ status: 'invalid' })
  })

  it('refuse de changer la position ou la date de relecture à la main', async () => {
    expect(await service.updateLesson(DRAFT, { position: 1 })).toMatchObject({
      status: 'invalid',
    })
    expect(await service.updateLesson(DRAFT, { lastReviewedAt: NOW.toISOString() })).toMatchObject({
      status: 'invalid',
    })
  })
})

describe('AdminContentService : suppression d’une leçon', () => {
  it('supprime un brouillon jamais publié, puis ne le trouve plus', async () => {
    expect(await service.deleteLesson(DRAFT)).toEqual({ status: 'deleted' })
    expect(await service.findLesson(DRAFT)).toBeNull()
    expect(await service.deleteLesson(DRAFT)).toEqual({ status: 'not-found' })
  })

  it('refuse de supprimer une leçon déjà publiée, même archivée depuis', async () => {
    await service.updateLesson(LIVE, { status: 'archived' })

    expect(await service.deleteLesson(LIVE)).toEqual({ status: 'published-once' })
  })

  it('ne supprime un chapitre qu’une fois sa dernière leçon supprimée', async () => {
    const draftChapter = saved(
      await service.createChapter(1, {
        slug: 'neuf',
        level: 'advanced',
        title: 'Neuf',
        summary: 'Neuf.',
      }),
    )
    const inside = saved(await service.createLesson(draftChapter.id, NEW_LESSON))

    expect(await service.deleteChapter(1, draftChapter.id)).toEqual({ status: 'in-use' })
    expect(await service.deleteLesson(inside.id)).toEqual({ status: 'deleted' })
    expect(await service.deleteChapter(1, draftChapter.id)).toEqual({ status: 'deleted' })
  })
})
