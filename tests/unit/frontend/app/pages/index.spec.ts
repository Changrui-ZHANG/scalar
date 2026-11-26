import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import Accueil from '../../../../../frontend/app/pages/index.vue'

describe("page d'accueil", () => {
  it('affiche le surtitre et la promesse', async () => {
    const page = await mountSuspended(Accueil)
    expect(page.text()).toContain('Pour reprendre un langage, ou l’apprendre')
    expect(page.text()).toContain('Une connaissance suffisante. Un rappel suffisant.')
  })
})
