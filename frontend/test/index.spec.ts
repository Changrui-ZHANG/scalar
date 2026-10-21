import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import Accueil from '../app/pages/index.vue'

describe("page d'accueil", () => {
  it('affiche le nom du produit et la nouvelle promesse', async () => {
    const page = await mountSuspended(Accueil)
    expect(page.text()).toContain('Scalar')
    expect(page.text()).toContain("Pour reprendre un langage, ou l'apprendre")
    expect(page.text()).toContain('Une connaissance suffisante. Un rappel suffisant.')
  })
})
