import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'

import LoginPage from '../app/pages/connexion.vue'
import { loginInputSchema } from '../app/utils/schemas'

describe('page de connexion', () => {
  it('demande un identifiant, pas forcément un email', async () => {
    const wrapper = await mountSuspended(LoginPage, { route: '/connexion' })

    expect(wrapper.text()).toContain('Identifiant')
    expect(wrapper.text()).not.toContain('Email')
    expect(wrapper.find('input[autocomplete="username"]').attributes('type')).toBe('text')
  })

  it('accepte test / test et signale un identifiant vide', () => {
    expect(loginInputSchema.safeParse({ email: 'test', password: 'test' }).success).toBe(true)

    const empty = loginInputSchema.safeParse({ email: ' ', password: 'test' })

    expect(empty.error?.issues[0]?.message).toBe('Identifiant obligatoire.')
  })
})
