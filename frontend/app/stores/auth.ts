import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Account, Credentials } from '~/types/account'
import * as authService from '~/services/auth'

export const useAuthStore = defineStore('auth', () => {
  // null : visiteur sans compte (ou session expirée).
  const account = ref<Account | null>(null)
  // Vrai une fois /auth/me lu : avant, on ne sait pas encore si le visiteur est connecté.
  const loaded = ref(false)

  // Appelée au montage de l'application (app.vue), comme la progression :
  // le rendu serveur se fait sans compte, puis l'en-tête se met à jour.
  async function loadSession(): Promise<void> {
    try {
      account.value = await authService.fetchMe()
    } catch {
      // 401 : pas de session. Autre erreur : on reste sans compte, le site marche quand même.
      account.value = null
    }
    loaded.value = true
  }

  async function login(credentials: Credentials): Promise<void> {
    account.value = await authService.login(credentials)
  }

  async function register(credentials: Credentials): Promise<void> {
    account.value = await authService.register(credentials)
  }

  async function logout(): Promise<void> {
    try {
      await authService.logout()
    } finally {
      account.value = null
    }
  }

  return { account, loaded, loadSession, login, register, logout }
})
