/** Comptes et metriques : lecture seule, rechargees a chaque visite. */

function required<T>(result: ApiResult<T>): T {
  if (!result.ok) {
    throw createError({
      statusCode: result.status ?? 503,
      statusMessage: result.message,
      fatal: true,
    })
  }
  return result.data
}

export const useAccountsStore = defineStore('accounts', () => {
  const api = useApi()
  const users = ref<readonly AdminAccount[]>([])
  const total = ref(0)
  const metrics = ref<Metrics | null>(null)

  async function loadUsers(query: AccountQuery): Promise<void> {
    const list = required(await api<AccountList>(`/admin/users${accountSearch(query)}`))
    users.value = list.users
    total.value = list.total
  }

  async function loadMetrics(): Promise<void> {
    metrics.value = required(await api<Metrics>('/admin/metrics'))
  }

  return { users, total, metrics, loadUsers, loadMetrics }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAccountsStore, import.meta.hot))
}
