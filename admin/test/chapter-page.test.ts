import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ChapterPage from '../app/pages/parcours/[trackId]/chapitres/[chapterId]/index.vue'

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

  it('propose de créer un exercice', async () => {
    serve(TRACK)
    const wrapper = await mountPage()

    expect(wrapper.html()).toContain('/parcours/1/chapitres/2/exercices/nouveau')
  })

  it('ne le propose pas pour un parcours sans langage : l’API le refuserait', async () => {
    serve({ ...TRACK, programmingLanguage: null })
    const wrapper = await mountPage()

    expect(wrapper.text()).not.toContain('Nouvel exercice')
  })
})
