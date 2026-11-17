import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useContentStore } from '../../../../../admin/app/stores/content'
import type { Lesson } from '../../../../../admin/app/utils/content'
import type { LessonInput } from '../../../../../admin/app/utils/schemas'
import { lessonInputSchema, toLessonInput } from '../../../../../admin/app/utils/schemas'

const apiMock = vi.hoisted(() => vi.fn())

mockNuxtImport('useApi', () => () => apiMock)

const INPUT: LessonInput = {
  title: 'Les tableaux',
  slug: 'tableaux',
  summary: 'Ranger plusieurs valeurs.',
  body: '## Tableaux\n\n```js\n  const notes = [12, 15]\n```\n',
  status: 'published',
}

const LESSON: Lesson = {
  id: 4,
  chapterId: 7,
  slug: 'tableaux',
  position: 1,
  title: 'Les tableaux',
  summary: 'Ranger plusieurs valeurs.',
  body: '## Tableaux',
  lastReviewedAt: '2026-11-16T10:00:00.000Z',
  status: 'draft',
}

const lastCall = () => {
  const [path, options] = apiMock.mock.lastCall as [
    string,
    { method?: string; body?: Record<string, unknown> } | undefined,
  ]
  return { path, method: options?.method, body: options?.body }
}

beforeEach(() => {
  apiMock.mockReset()
})

describe('store des leçons', () => {
  it('charge les leçons d’un chapitre', async () => {
    apiMock.mockResolvedValue({ ok: true, data: [LESSON] })
    const store = useContentStore()

    await store.loadLessons(7)

    expect(lastCall().path).toBe('/admin/chapters/7/lessons')
    expect(store.lessons).toEqual([LESSON])
  })

  it('crée sous le chapitre, sans statut : l’API refuse ce champ à la création', async () => {
    apiMock.mockResolvedValue({ ok: true, data: LESSON })

    expect(await useContentStore().createLesson(7, INPUT)).toEqual({ ok: true, item: LESSON })
    const { path, method, body } = lastCall()
    expect([method, path]).toEqual(['POST', '/admin/chapters/7/lessons'])
    expect(body).toEqual({
      title: INPUT.title,
      slug: INPUT.slug,
      summary: INPUT.summary,
      body: INPUT.body,
    })
  })

  it('envoie le statut à la modification', async () => {
    apiMock.mockResolvedValue({ ok: true, data: LESSON })

    await useContentStore().updateLesson(4, INPUT)

    const { path, method, body } = lastCall()
    expect([method, path]).toEqual(['PATCH', '/admin/lessons/4'])
    expect(body).toMatchObject({ status: 'published', body: INPUT.body })
  })

  it('vise le champ slug quand il est déjà pris', async () => {
    apiMock.mockResolvedValue({ ok: false, status: 409, message: 'Ce slug est déjà utilisé.' })

    expect(await useContentStore().createLesson(7, INPUT)).toEqual({
      ok: false,
      field: 'slug',
      message: 'Ce slug est déjà utilisé.',
    })
  })

  it('renvoie null pour une leçon inconnue', async () => {
    apiMock.mockResolvedValue({ ok: false, status: 404, message: 'Cours introuvable.' })

    expect(await useContentStore().findLesson(4)).toBeNull()
    expect(lastCall().path).toBe('/admin/lessons/4')
  })
})

describe('lessonInputSchema', () => {
  it('garde le cours au caractère près : l’indentation d’un bloc de code compte', () => {
    const parsed = lessonInputSchema.parse({ ...INPUT, body: '  const a = 1\n' })

    expect(parsed.body).toBe('  const a = 1\n')
  })

  it.each([
    ['un titre vide', { title: '  ' }],
    ['un titre trop long', { title: 'x'.repeat(121) }],
    ['un résumé trop long', { summary: 'x'.repeat(301) }],
    ['un cours vide', { body: ' \n ' }],
    ['un cours trop long', { body: 'x'.repeat(20_001) }],
    ['un slug invalide', { slug: 'Les Tableaux' }],
  ])('refuse %s, comme l’API', (_name, extra) => {
    expect(lessonInputSchema.safeParse({ ...INPUT, ...extra }).success).toBe(false)
  })

  it('relit une leçon de l’API dans le formulaire d’édition', () => {
    expect(toLessonInput(LESSON)).toEqual({
      title: LESSON.title,
      slug: LESSON.slug,
      summary: LESSON.summary,
      body: LESSON.body,
      status: LESSON.status,
    })
  })
})
