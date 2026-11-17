import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'

import AdminBreadcrumb from '../app/components/AdminBreadcrumb.vue'
import { breadcrumb } from '../app/utils/breadcrumb'

const TRACK = { id: 1, name: 'JavaScript' }
const CHAPTER = { id: 2, title: 'Les boucles' }
const ROOT = { label: 'Parcours', icon: 'i-lucide-route', to: '/parcours' }

describe('fil d’Ariane', () => {
  it('liste des parcours : un seul niveau', () => {
    expect(breadcrumb({})).toEqual([ROOT])
  })

  it('page d’un parcours : la liste, puis le parcours', () => {
    expect(breadcrumb({ track: TRACK })).toEqual([ROOT, { label: 'JavaScript', to: '/parcours/1' }])
  })

  it('page sous un chapitre : chaque niveau mène à sa page, la page courante comprise', () => {
    expect(
      breadcrumb({
        track: TRACK,
        chapter: CHAPTER,
        extra: [{ label: 'Somme', to: '/parcours/1/chapitres/2/exercices/3' }],
      }),
    ).toEqual([
      ROOT,
      { label: 'JavaScript', to: '/parcours/1' },
      { label: 'Les boucles', to: '/parcours/1/chapitres/2' },
      { label: 'Somme', to: '/parcours/1/chapitres/2/exercices/3' },
    ])
  })
})

describe('AdminBreadcrumb', () => {
  const mountCrumbs = () =>
    mountSuspended(AdminBreadcrumb, {
      props: { items: breadcrumb({ track: TRACK, chapter: CHAPTER }) },
    })

  it('rend chaque étape cliquable, la page courante signalée', async () => {
    const links = (await mountCrumbs()).findAll('a')

    expect(links.map((a) => a.attributes('href')?.replace(/^\/admin/, ''))).toEqual([
      '/parcours',
      '/parcours/1',
      '/parcours/1/chapitres/2',
    ])
    expect(links.at(-1)!.attributes('aria-current')).toBe('page')
  })

  it('souligne chaque lien, page courante comprise', async () => {
    const links = (await mountCrumbs()).findAll('a')

    expect(links).toHaveLength(3)
    for (const link of links) {
      expect(link.classes()).toContain('underline')
    }
  })

  it('sépare les étapes par des chevrons, dans un bloc encadré', async () => {
    const wrapper = await mountCrumbs()

    expect(wrapper.find('nav[aria-label="Fil d’Ariane"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-slot="separatorIcon"]')).toHaveLength(2)
    expect(wrapper.html()).toContain('chevron-right')
    expect(wrapper.classes()).toEqual(expect.arrayContaining(['border', 'rounded-md']))
  })
})
