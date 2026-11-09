import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import TracksPage from '../app/pages/parcours/index.vue'
import TrackPage from '../app/pages/parcours/[trackId]/index.vue'

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

const DATA: Record<string, unknown> = {
  '/auth/me': { id: 'a', email: 'admin@scalar.test', role: 'admin' },
  '/admin/tracks': [TRACK],
  '/admin/tracks/1': TRACK,
  '/admin/tracks/1/chapters': [CHAPTER],
}

const links = (wrapper: Awaited<ReturnType<typeof mountSuspended>>, label: string) =>
  wrapper
    .findAll('a')
    .filter((a) => a.text() === label)
    .map((a) => a.attributes('href'))

beforeEach(() => {
  apiMock.mockReset()
  apiMock.mockImplementation(async (path: string) =>
    path in DATA
      ? { ok: true, data: DATA[path] }
      : { ok: false, status: 404, message: 'Introuvable.' },
  )
})

describe('boutons des listes', () => {
  it('ouvre et modifie un parcours depuis la liste', async () => {
    const wrapper = await mountSuspended(TracksPage, { route: '/parcours' })

    expect(links(wrapper, 'Ouvrir')).toEqual([expect.stringContaining('/parcours/1')])
    expect(links(wrapper, 'Modifier')).toEqual([expect.stringContaining('/parcours/1/modifier')])
  })

  it('ouvre et modifie un chapitre depuis son parcours', async () => {
    const wrapper = await mountSuspended(TrackPage, { route: '/parcours/1' })

    expect(links(wrapper, 'Ouvrir')).toEqual([expect.stringContaining('/parcours/1/chapitres/2')])
    expect(links(wrapper, 'Modifier')).toContainEqual(
      expect.stringContaining('/parcours/1/chapitres/2/modifier'),
    )
  })
})
