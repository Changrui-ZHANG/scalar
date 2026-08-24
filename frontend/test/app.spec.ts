import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import App from '../app/app.vue'

describe('app', () => {
  it('rend le nom du produit', async () => {
    const composant = await mountSuspended(App)
    expect(composant.text()).toContain('Scalar')
  })
})
