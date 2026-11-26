import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as authService from '../../../../../frontend/app/services/auth'
import { useAuthStore } from '../../../../../frontend/app/stores/auth'

const account = { id: 'a1', email: 'ada@example.com', role: 'learner' as const }

describe('stores/auth', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('lit la session au chargement', async () => {
    vi.spyOn(authService, 'fetchMe').mockResolvedValueOnce(account)
    const store = useAuthStore()

    await store.loadSession()

    expect(store.loaded).toBe(true)
    expect(store.account).toEqual(account)
  })

  it('reste sans compte quand il n’y a pas de session', async () => {
    vi.spyOn(authService, 'fetchMe').mockRejectedValueOnce({ statusCode: 401 })
    const store = useAuthStore()

    await store.loadSession()

    expect(store.loaded).toBe(true)
    expect(store.account).toBeNull()
  })

  it('garde le compte après connexion et l’oublie après déconnexion', async () => {
    vi.spyOn(authService, 'login').mockResolvedValueOnce(account)
    vi.spyOn(authService, 'logout').mockResolvedValueOnce()
    const store = useAuthStore()

    await store.login({ email: 'ada@example.com', password: 'motdepasse' })
    expect(store.account).toEqual(account)

    await store.logout()
    expect(store.account).toBeNull()
  })

  it('ne garde pas de compte quand la connexion est refusée', async () => {
    vi.spyOn(authService, 'login').mockRejectedValueOnce({ statusCode: 401 })
    const store = useAuthStore()

    await expect(store.login({ email: 'ada@example.com', password: 'faux' })).rejects.toBeTruthy()
    expect(store.account).toBeNull()
  })
})
