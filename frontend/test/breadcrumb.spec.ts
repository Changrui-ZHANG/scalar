import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import BreadcrumbTrail from '../app/components/BreadcrumbTrail.vue'

describe('BreadcrumbTrail', () => {
  const items = [
    { label: 'Parcours', to: '/javascript' },
    { label: 'JavaScript' },
    { label: 'Variables', to: '/javascript/variables' },
    { label: 'Échanger deux valeurs', to: '/ignore' },
  ]

  it('rend chaque étape dans l’ordre, avec des séparateurs', async () => {
    const wrapper = await mountSuspended(BreadcrumbTrail, { props: { items } })

    expect(wrapper.findAll('li')).toHaveLength(4)
    expect(wrapper.text()).toMatch(/Parcours\s*\/\s*JavaScript\s*\/\s*Variables\s*\/\s*Échanger/)
  })

  it('fait des liens des étapes intermédiaires qui en ont un', async () => {
    const wrapper = await mountSuspended(BreadcrumbTrail, { props: { items } })
    const hrefs = wrapper.findAll('a').map((a) => a.attributes('href'))

    expect(hrefs).toEqual(['/javascript', '/javascript/variables'])
  })

  it('annonce la page courante sans en faire un lien', async () => {
    const wrapper = await mountSuspended(BreadcrumbTrail, { props: { items } })
    const current = wrapper.find('[aria-current="page"]')

    expect(current.text()).toBe('Échanger deux valeurs')
    expect(current.element.tagName).toBe('SPAN')
  })

  it('se présente comme un fil d’Ariane aux lecteurs d’écran', async () => {
    const wrapper = await mountSuspended(BreadcrumbTrail, { props: { items } })
    expect(wrapper.find('nav').attributes('aria-label')).toBe('Fil d’Ariane')
  })
})
