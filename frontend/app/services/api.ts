import type { ApiSuccess } from '@scalar/shared/api'

export interface ApiFetchOptions {
  readonly method?: 'GET' | 'POST'
  readonly body?: Record<string, unknown> | BodyInit | null
  readonly timeout?: number // ms
  readonly headers?: Record<string, string>
}

/**
 * Appel HTTP brut sur l'API publique Scalar.
 * Utilise apiInternalBase côté serveur et public.apiBase côté navigateur.
 */
export async function apiFetch<T>(path: string, options?: ApiFetchOptions): Promise<T> {
  const nuxtApp = tryUseNuxtApp()
  const apiInternal = nuxtApp?.$config?.apiInternalBase
  const publicApi = nuxtApp?.$config?.public?.apiBase

  const baseURL = import.meta.server
    ? (apiInternal ?? process.env.NUXT_API_INTERNAL_BASE ?? 'http://backend:3001/api/v1')
    : (publicApi ?? '/api/v1')

  // Le navigateur envoie seul le cookie de session. Pendant le rendu serveur,
  // on recopie celui de la page demandée : sans lui, un abonné Premium
  // recevrait un 403 sur ses chapitres.
  const headers: Record<string, string> = { ...options?.headers }
  if (import.meta.server) {
    const cookie = nuxtApp?.ssrContext?.event.node.req.headers.cookie
    if (cookie) {
      headers.cookie = cookie
    }
  }

  const res = await $fetch<ApiSuccess<T>>(path, {
    baseURL,
    method: options?.method ?? 'GET',
    body: options?.body,
    timeout: options?.timeout,
    headers,
  })

  return res.data
}
