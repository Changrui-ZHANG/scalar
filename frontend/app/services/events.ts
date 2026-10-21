import type { EventBody } from '@scalar/shared/api'

export function sendEvent(body: EventBody): void {
  try {
    const nuxtApp = tryUseNuxtApp()
    const apiBase = nuxtApp?.$config?.public?.apiBase ?? '/api/v1'
    fetch(`${apiBase}/events`, {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }).catch(() => {
      // erreurs avalées, aucun nouvel essai (§ 9)
    })
  } catch {
    // Si fetch échoue hors contexte, erreurs avalées
  }
}
