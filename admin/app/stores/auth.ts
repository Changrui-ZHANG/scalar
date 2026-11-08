export interface Account {
  readonly id: string
  readonly email: string
  readonly role: 'learner' | 'admin'
}

export const useAuthStore = defineStore('auth', () => {
  const api = useApi()
  const account = ref<Account | null>(null)

  async function loadSession(): Promise<void> {
    const result = await api<Account>('/auth/me')
    account.value = result.ok ? result.data : null
  }

  async function login(credentials: LoginInput): Promise<ApiResult<Account>> {
    const result = await api<Account>('/auth/login', { method: 'POST', body: credentials })
    account.value = result.ok ? result.data : null
    return result
  }

  async function logout(): Promise<void> {
    await api('/auth/logout', { method: 'POST' })
    account.value = null
  }

  return { account, loadSession, login, logout }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot))
}
