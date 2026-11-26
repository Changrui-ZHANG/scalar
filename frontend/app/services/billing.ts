import type { SubscriptionPlan, SubscriptionView } from '~/types/billing'
import { apiFetch } from './api'

// Le paiement et la gestion de l'abonnement se font chez Stripe : le backend
// renvoie l'adresse de la page Stripe, où le navigateur part ensuite.

export function fetchSubscription(): Promise<SubscriptionView> {
  return apiFetch<SubscriptionView>('/billing/subscription')
}

export async function startCheckout(plan: SubscriptionPlan): Promise<string> {
  const redirect = await apiFetch<{ url: string }>('/billing/checkout', {
    method: 'POST',
    body: { plan },
  })
  return redirect.url
}

export async function openBillingPortal(): Promise<string> {
  const redirect = await apiFetch<{ url: string }>('/billing/portal', { method: 'POST' })
  return redirect.url
}
