import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ExerciseRowActions from '../../../../../../../../../admin/app/components/ExerciseRowActions.vue'
import ChapterPage from '../../../../../../../../../admin/app/pages/parcours/[trackId]/chapitres/[chapterId]/index.vue'

const apiMock = vi.hoisted(() => vi.fn())

mockNuxtImport('useApi', () => () => apiMock)

const TRACK = {
  id: 1,
  slug: 'javascript',
  position: 1,
  name: 'JavaScript',
  summary: 'Le langage.',
  programmingLanguage: 'javascript',
  status: 'published',
}
const CHAPTER = {
  id: 2,
  trackId: 1,
  slug: 'bases',
  level: 'beginner',
  position: 1,
  title: 'Bases',
  summary: 'Les bases.',
  status: 'published',
}
const EXERCISE = {
  id: 3,
  chapterId: 2,
  slug: 'somme',
  position: 1,
  title: 'Somme',
  functionName: 'somme',
  testCases: [],
  solutionCheckStatus: 'passed',
  status: 'draft',
}

function serve(
  track: typeof TRACK | (Omit<typeof TRACK, 'programmingLanguage'> & { programmingLanguage: null }),
) {
  const data: Record<string, unknown> = {
    '/auth/me': { id: 'a', email: 'admin@scalar.test', role: 'admin' },
    '/admin/tracks/1': track,
    '/admin/tracks/1/chapters/2': CHAPTER,
    '/admin/chapters/2/exercises': [EXERCISE],
    '/admin/chapters/2/lessons': [],
  }
  apiMock.mockImplementation(async (path: string) =>
    path in data
      ? { ok: true, data: data[path] }
      : { ok: false, status: 404, message: 'Introuvable.' },
  )
}

const mountPage = () => mountSuspended(ChapterPage, { route: '/parcours/1/chapitres/2' })

beforeEach(() => {
  apiMock.mockReset()
})

describe('page d’un chapitre', () => {
  it('ouvre chaque exercice et montre si sa solution est vérifiée', async () => {
    serve(TRACK)
    const wrapper = await mountPage()

    expect(wrapper.html()).toContain('/parcours/1/chapitres/2/exercices/3')
    expect(wrapper.text()).toContain('Vérifiée')
  })

  it('met à jour la ligne après une action', async () => {
    serve(TRACK)
    const wrapper = await mountPage()
    expect(wrapper.text()).not.toContain('En échec')

    wrapper
      .findComponent(ExerciseRowActions)
      .vm.$emit('updated', { ...EXERCISE, solutionCheckStatus: 'failed' })
    await flushPromises()

    expect(wrapper.text()).toContain('En échec')
  })

  it('montre le fil d’Ariane : chaque étape cliquable, jusqu’au chapitre', async () => {
    serve(TRACK)
    const nav = (await mountPage()).find('nav[aria-label="Fil d’Ariane"]')

    expect(nav.exists()).toBe(true)
    const hrefs = nav.findAll('a').map((a) => a.attributes('href')?.replace(/^\/admin/, ''))
    expect(hrefs).toEqual(['/parcours', '/parcours/1', '/parcours/1/chapitres/2'])
    expect(nav.text()).toContain('JavaScript')
    expect(nav.text()).toContain('Bases')
  })

  it('propose de créer un exercice', async () => {
    serve(TRACK)
    const wrapper = await mountPage()

    expect(wrapper.html()).toContain('/parcours/1/chapitres/2/exercices/nouveau')
  })

  it('ne le propose pas pour un parcours sans langage : l’API le refuserait', async () => {
    serve({ ...TRACK, programmingLanguage: null })
    const wrapper = await mountPage()

    expect(wrapper.text()).not.toContain('Nouvel exercice')
    expect(wrapper.text()).not.toContain('Générer avec l’IA')
  })
})

describe('page d’un chapitre : « Générer avec l’IA »', () => {
  const TITLE_INPUT = 'input[aria-label="Titre de l’exercice à générer"]'
  const generateButton = (wrapper: Awaited<ReturnType<typeof mountPage>>) =>
    wrapper.findAll('button').find((b) => b.text().includes('Générer avec l’IA'))!
  const currentPath = () => useRouter().currentRoute.value.path

  async function generate(wrapper: Awaited<ReturnType<typeof mountPage>>, title: string) {
    await wrapper.find(TITLE_INPUT).setValue(title)
    await flushPromises()
    await generateButton(wrapper).trigger('click')
    await flushPromises()
  }

  it('reste désactivé tant que le titre est vide', async () => {
    serve(TRACK)
    const wrapper = await mountPage()

    expect(generateButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('génère un brouillon à partir du titre, puis l’ouvre pour le relire', async () => {
    serve(TRACK)
    const wrapper = await mountPage()
    apiMock.mockResolvedValue({
      ok: true,
      data: {
        exercise: { ...EXERCISE, id: 9, generatedByAi: true },
        solutionCheck: { passed: true, checks: [], stderr: '' },
      },
    })

    await generate(wrapper, 'Somme des pairs')

    const posts = (apiMock.mock.calls as [string, { method?: string; body?: unknown }?][]).filter(
      ([, options]) => options?.method === 'POST',
    )
    expect(posts).toEqual([
      [
        '/admin/chapters/2/exercises/generate',
        { method: 'POST', body: { topic: 'Somme des pairs' } },
      ],
    ])
    await vi.waitFor(() => expect(currentPath()).toBe('/parcours/1/chapitres/2/exercices/9'))
  })

  it('reste sur le chapitre, titre conservé, si la génération échoue', async () => {
    serve(TRACK)
    const wrapper = await mountPage()
    apiMock.mockResolvedValue({ ok: false, status: 503, message: 'L’IA est indisponible.' })

    await generate(wrapper, 'Somme des pairs')

    expect(currentPath()).toBe('/parcours/1/chapitres/2')
    expect((wrapper.find(TITLE_INPUT).element as HTMLInputElement).value).toBe('Somme des pairs')
  })
})
