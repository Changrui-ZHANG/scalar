import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it, vi } from 'vitest'

import DefaultLayout from '../../../../../admin/app/layouts/default.vue'

const apiMock = vi.hoisted(() => vi.fn())

mockNuxtImport('useApi', () => () => apiMock)

describe('en-tête du backoffice', () => {
  const mountLayout = () => {
    apiMock.mockResolvedValue({
      ok: true,
      data: { id: 'a', email: 'admin@scalar.test', role: 'admin' },
    })
    return mountSuspended(DefaultLayout, { route: '/parcours' })
  }

  it('montre le logo Scalar, le même fichier que le favicon, sous la base /admin/', async () => {
    const logo = (await mountLayout()).find('img[src$="logo.svg"]')

    expect(logo.exists()).toBe(true)
    expect(logo.attributes('src')).toBe('/admin/logo.svg')
    // Decoratif : le nom « Scalar » suit en texte, le lecteur d'ecran ne le dit pas deux fois.
    expect(logo.attributes('alt')).toBe('')
  })

  it('nomme la marque et le backoffice, et ramène aux parcours', async () => {
    const wrapper = await mountLayout()
    const home = wrapper.find('a[aria-label="Scalar Backoffice, accueil"]')

    expect(home.exists()).toBe(true)
    expect(home.attributes('href')).toMatch(/\/parcours$/)
    expect(home.text()).toContain('Scalar')
    expect(home.text()).toContain('Backoffice')
    expect(wrapper.text()).not.toContain('Scalar · Backoffice')
  })
})
