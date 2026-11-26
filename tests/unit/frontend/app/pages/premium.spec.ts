import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import PremiumPage from '../../../../../frontend/app/pages/premium.vue'
import * as billing from '../../../../../frontend/app/services/billing'
import { useAuthStore } from '../../../../../frontend/app/stores/auth'

const account = { id: 'a1', email: 'ada@example.com', role: 'learner' as const }

// Session déjà lue, comme après le montage d'app.vue.
function signIn(value: typeof account | null) {
  const auth = useAuthStore()
  auth.account = value
  auth.loaded = true
}

describe('page /premium', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    signIn(null)
  })

  it('demande un compte à un visiteur', async () => {
    signIn(null)
    const page = await mountSuspended(PremiumPage)

    expect(page.text()).toContain('Créez un compte pour vous abonner')
    expect(page.text()).not.toContain('Choisir la formule')
  })

  it('propose les deux formules et affiche l’erreur quand le paiement est indisponible', async () => {
    signIn(account)
    vi.spyOn(billing, 'fetchSubscription').mockResolvedValue({ premium: false, subscription: null })
    vi.spyOn(billing, 'startCheckout').mockRejectedValueOnce({
      statusCode: 503,
      data: { error: 'Le paiement est momentanément indisponible.' },
    })
    const page = await mountSuspended(PremiumPage)
    await flushPromises()

    expect(page.text()).toContain('Choisir la formule mensuel')
    const yearly = page.findAll('button').find((b) => b.text().includes('formule annuel'))
    await yearly!.trigger('click')
    await flushPromises()

    expect(billing.startCheckout).toHaveBeenCalledWith('yearly')
    expect(page.find('[role="alert"]').text()).toBe('Le paiement est momentanément indisponible.')
  })

  it('montre l’abonnement d’un abonné', async () => {
    signIn(account)
    vi.spyOn(billing, 'fetchSubscription').mockResolvedValue({
      premium: true,
      subscription: { status: 'active', plan: 'yearly', currentPeriodEnd: '2027-11-26T10:00:00Z' },
    })
    const page = await mountSuspended(PremiumPage)
    await flushPromises()

    expect(page.text()).toContain('Vous êtes Premium')
    expect(page.text()).toContain('Abonnement annuel, renouvelé le 26 novembre 2027.')
    expect(page.text()).toContain('Gérer mon abonnement')
  })

  it('reconnaît un admin, Premium sans abonnement', async () => {
    signIn({ ...account, role: 'learner' })
    vi.spyOn(billing, 'fetchSubscription').mockResolvedValue({ premium: true, subscription: null })
    const page = await mountSuspended(PremiumPage)
    await flushPromises()

    expect(page.text()).toContain('Votre compte a accès à tous les chapitres.')
    expect(page.text()).not.toContain('Gérer mon abonnement')
  })
})
