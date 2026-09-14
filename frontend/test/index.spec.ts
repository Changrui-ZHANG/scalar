import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import Accueil from '../app/pages/index.vue'

describe("page d'accueil", () => {
  it('affiche le nom du produit', async () => {
    const page = await mountSuspended(Accueil)
    expect(page.text()).toContain('Scalar')
  })
})
