import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import MentionsLegales from '../app/pages/mentions-legales.vue'
import Confidentialite from '../app/pages/confidentialite.vue'
import LayoutFooter from '../app/components/layout/LayoutFooter.vue'

describe('pages légales et pied de page', () => {
  it('affiche le pied de page avec les liens légaux', async () => {
    const footer = await mountSuspended(LayoutFooter)
    expect(footer.text()).toContain('© 2026 Scalar')
    expect(footer.text()).toContain('Mentions légales')
    expect(footer.text()).toContain('Confidentialité')

    const links = footer.findAll('a')
    const hrefs = links.map((l) => l.attributes('href'))
    expect(hrefs).toContain('/mentions-legales')
    expect(hrefs).toContain('/confidentialite')
  })

  it('affiche la page des mentions légales', async () => {
    const page = await mountSuspended(MentionsLegales)
    expect(page.text()).toContain('Mentions légales')
    expect(page.text()).toContain('Changrui ZHANG')
    expect(page.text()).toContain('Cédric VONIN')
    expect(page.text()).toContain('m.zhang.changrui@gmail.com')
  })

  it('affiche la politique de confidentialité', async () => {
    const page = await mountSuspended(Confidentialite)
    expect(page.text()).toContain('Politique de confidentialité')
    expect(page.text()).toContain('localStorage')
    expect(page.text()).toContain('Piston')
    expect(page.text()).toContain('CNIL')
  })
})
