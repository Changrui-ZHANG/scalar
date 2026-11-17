import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, beforeEach, expect, it, vi } from 'vitest'

import LessonForm from '../../../../../../../../../../admin/app/components/LessonForm.vue'
import MarkdownPreview from '../../../../../../../../../../admin/app/components/MarkdownPreview.vue'
import { useRouteLesson } from '../../../../../../../../../../admin/app/composables/useRouteRecord'
import ChapterPage from '../../../../../../../../../../admin/app/pages/parcours/[trackId]/chapitres/[chapterId]/index.vue'
import NewLessonPage from '../../../../../../../../../../admin/app/pages/parcours/[trackId]/chapitres/[chapterId]/lecons/nouveau.vue'
import EditLessonPage from '../../../../../../../../../../admin/app/pages/parcours/[trackId]/chapitres/[chapterId]/lecons/[lessonId].vue'
import type { Chapter, Lesson } from '../../../../../../../../../../admin/app/utils/content'
import type { LessonInput } from '../../../../../../../../../../admin/app/utils/schemas'

const apiMock = vi.hoisted(() => vi.fn())

mockNuxtImport('useApi', () => () => apiMock)

const CHAPTER_URL = '/parcours/1/chapitres/2'
const LESSON_URL = `${CHAPTER_URL}/lecons/4`

const TRACK = {
  id: 1,
  slug: 'conception',
  position: 1,
  name: 'Conception',
  summary: 'Bien concevoir.',
  programmingLanguage: null,
  status: 'published',
}

const LESSON: Lesson = {
  id: 4,
  chapterId: 2,
  slug: 'nommer',
  position: 1,
  title: 'Bien nommer',
  summary: 'Des noms qui disent ce qu’ils désignent.',
  body: '## Nommer\n\nUn nom dit ce que la valeur représente.',
  lastReviewedAt: '2026-11-16T10:00:00.000Z',
  status: 'published',
}

const INPUT: LessonInput = {
  title: 'Bien nommer',
  slug: 'nommer',
  summary: 'Des noms qui disent ce qu’ils désignent.',
  body: 'Un nom dit ce que la valeur représente.',
  status: 'draft',
}

function serve(lesson: Lesson) {
  const data: Record<string, unknown> = {
    '/auth/me': { id: 'a', email: 'admin@scalar.test', role: 'admin' },
    '/admin/tracks/1': TRACK,
    '/admin/tracks/1/chapters/2': {
      id: 2,
      trackId: 1,
      slug: 'nommage',
      level: 'beginner',
      position: 1,
      title: 'Nommage',
      summary: 'Bien nommer.',
      status: 'published',
    },
    '/admin/chapters/2/exercises': [],
    '/admin/chapters/2/lessons': [lesson],
    '/admin/lessons/4': lesson,
  }
  apiMock.mockImplementation(async (path: string) =>
    path in data
      ? { ok: true, data: data[path] }
      : { ok: false, status: 404, message: 'Introuvable.' },
  )
}

const currentPath = () => useRouter().currentRoute.value.path

beforeEach(() => {
  apiMock.mockReset()
  serve(LESSON)
})

describe('leçons dans la page d’un chapitre', () => {
  const mountPage = () => mountSuspended(ChapterPage, { route: CHAPTER_URL })

  it('liste les leçons, chacune ouvrant sa page d’édition', async () => {
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Bien nommer')
    expect(wrapper.html()).toContain(LESSON_URL)
  })

  it('propose de créer une leçon, même dans un parcours sans langage', async () => {
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Nouvelle leçon')
    expect(wrapper.html()).toContain(`${CHAPTER_URL}/lecons/nouveau`)
  })
})

describe('formulaire d’une leçon', () => {
  const mountForm = (editing: boolean, initial: LessonInput = INPUT) =>
    mountSuspended(LessonForm, {
      props: { initial, save: vi.fn(), submitLabel: 'Enregistrer', cancelTo: '/parcours', editing },
    })

  it('ne propose pas de statut à la création : la leçon naît brouillon', async () => {
    expect((await mountForm(false)).text()).not.toContain('Publié')
  })

  it('propose publication et archivage en édition', async () => {
    const wrapper = await mountForm(true)

    expect(wrapper.text()).toContain('Publié')
    expect(wrapper.text()).toContain('Archivé')
  })

  it('montre l’aperçu du cours tel que le site l’affichera', async () => {
    const wrapper = await mountForm(true, { ...INPUT, body: '## Nommer\n\n- `camelCase`' })

    const preview = wrapper.findComponent(MarkdownPreview)
    expect(preview.props('source')).toBe('## Nommer\n\n- `camelCase`')
    expect(preview.find('h3').text()).toBe('Nommer')
  })
})

describe('page de création d’une leçon', () => {
  const mountPage = () => mountSuspended(NewLessonPage, { route: `${CHAPTER_URL}/lecons/nouveau` })

  it('crée la leçon dans le chapitre de l’URL', async () => {
    const wrapper = await mountPage()
    apiMock.mockResolvedValue({ ok: true, data: LESSON })

    await wrapper.findComponent(LessonForm).props('save')(INPUT)

    const [path, options] = apiMock.mock.lastCall as [string, { method: string }]
    expect([options.method, path]).toEqual(['POST', '/admin/chapters/2/lessons'])
  })

  it('revient au chapitre une fois la leçon créée', async () => {
    const wrapper = await mountPage()

    wrapper.findComponent(LessonForm).vm.$emit('saved', LESSON)

    await vi.waitFor(() => expect(currentPath()).toBe(CHAPTER_URL))
  })
})

describe('page d’édition d’une leçon', () => {
  const mountPage = () => mountSuspended(EditLessonPage, { route: LESSON_URL })

  it('remplit le formulaire avec la leçon et enregistre sur la bonne leçon', async () => {
    const wrapper = await mountPage()
    const form = wrapper.findComponent(LessonForm)
    expect(form.props('initial')).toMatchObject({ title: 'Bien nommer', status: 'published' })
    apiMock.mockResolvedValue({ ok: true, data: LESSON })

    await form.props('save')(INPUT)

    const [path, options] = apiMock.mock.lastCall as [string, { method: string }]
    expect([options.method, path]).toEqual(['PATCH', '/admin/lessons/4'])
  })

  it('revient au chapitre après l’enregistrement', async () => {
    const wrapper = await mountPage()

    wrapper.findComponent(LessonForm).vm.$emit('saved', LESSON)

    await vi.waitFor(() => expect(currentPath()).toBe(CHAPTER_URL))
  })

  const demoLinks = (wrapper: Awaited<ReturnType<typeof mountPage>>) =>
    wrapper
      .findAll('a')
      .filter((a) => a.text().includes('Retour à la démo'))
      .map((a) => a.attributes('href')?.replace(/^\/admin/, ''))

  it('venue de la démo : propose de revenir à la même leçon de la démo', async () => {
    const wrapper = await mountSuspended(EditLessonPage, { route: `${LESSON_URL}?demo=1` })

    expect(demoLinks(wrapper)).toEqual(['/parcours/1/apercu/lecons/4?demo=1'])
  })

  it('venue de la démo : y revient après l’enregistrement', async () => {
    const wrapper = await mountSuspended(EditLessonPage, { route: `${LESSON_URL}?demo=1` })

    wrapper.findComponent(LessonForm).vm.$emit('saved', LESSON)

    await vi.waitFor(() =>
      expect(useRouter().currentRoute.value.fullPath).toBe('/parcours/1/apercu/lecons/4?demo=1'),
    )
  })

  it('hors démo : pas de retour à la démo', async () => {
    expect(demoLinks(await mountPage())).toEqual([])
  })

  it('trouve la leçon du chapitre de l’URL', async () => {
    await useRouter().push(LESSON_URL)

    expect(await useRouteLesson({ id: 2 } as Chapter)).toEqual(LESSON)
  })

  it('renvoie 404 pour une leçon d’un autre chapitre', async () => {
    serve({ ...LESSON, chapterId: 99 })
    await useRouter().push(LESSON_URL)

    await expect(useRouteLesson({ id: 2 } as Chapter)).rejects.toMatchObject({ statusCode: 404 })
  })
})
