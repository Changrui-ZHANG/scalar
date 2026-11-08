interface ApiOptions {
  readonly method?: 'GET' | 'POST' | 'PATCH'
  readonly body?: Record<string, unknown>
}

/** A appeler dans un setup : la fonction renvoyee sert ensuite n'importe ou. */
export function useApi() {
  const { public: publicConfig, app } = useRuntimeConfig()
  const router = useRouter()

  return async function request<T>(path: string, options: ApiOptions = {}): Promise<ApiResult<T>> {
    try {
      const body = await $fetch<{ data: T }>(path, { baseURL: publicConfig.apiBase, ...options })
      return { ok: true, data: body.data }
    } catch (error: unknown) {
      const failure = toApiFailure(error)
      // Hors /auth/* : la connexion refusee reste sur son formulaire.
      if (failure.status === 401 && !path.startsWith('/auth/')) {
        const from = encodeURIComponent(router.currentRoute.value.fullPath)
        window.location.assign(`${app.baseURL}connexion?redirect=${from}`)
      }
      return failure
    }
  }
}
