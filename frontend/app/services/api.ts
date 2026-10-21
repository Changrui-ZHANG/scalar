import type { ApiSuccess } from '@scalar/shared/api'

export interface ApiFetchOptions {
  readonly method?: 'GET' | 'POST'
  readonly body?: Record<string, unknown> | BodyInit | null
  readonly timeout?: number // ms
}

/**
 * Appel HTTP brut sur l'API publique Scalar.
 * Utilise apiInternalBase côté serveur et public.apiBase côté navigateur.
 */
export async function apiFetch<T>(path: string, options?: ApiFetchOptions): Promise<T> {
  const config = useRuntimeConfig()
  const baseURL = import.meta.server
    ? (config.apiInternalBase ?? 'http://127.0.0.1:3001/api/v1')
    : (config.public?.apiBase ?? '/api/v1')

  const res = await $fetch<ApiSuccess<T>>(path, {
    baseURL,
    method: options?.method ?? 'GET',
    body: options?.body,
    timeout: options?.timeout,
  })

  return res.data
}
