<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const NAVIGATION: NavigationMenuItem[] = [
  { label: 'Parcours', icon: 'i-lucide-route', to: '/parcours' },
]

const auth = useAuthStore()
// Sous la base /admin/ : un chemin « /logo.svg » viserait le fichier du front.
const logo = `${useRuntimeConfig().app.baseURL}logo.svg`

async function logout() {
  await auth.logout()
  return navigateTo('/connexion')
}
</script>

<template>
  <UDashboardGroup>
    <UDashboardSidebar collapsible>
      <template #header="{ collapsed }">
        <NuxtLink
          to="/parcours"
          aria-label="Scalar Backoffice, accueil"
          class="flex min-w-0 items-center gap-2"
        >
          <img :src="logo" alt="" width="28" height="28" class="size-7 shrink-0" />
          <template v-if="!collapsed">
            <span class="text-lg font-bold">Scalar</span>
            <UBadge label="Backoffice" color="neutral" variant="subtle" size="sm" />
          </template>
        </NuxtLink>
      </template>
      <UNavigationMenu :items="NAVIGATION" orientation="vertical" />
      <template #footer>
        <div class="grid w-full gap-1">
          <span class="text-muted truncate text-sm">{{ auth.account?.email }}</span>
          <UButton
            icon="i-lucide-log-out"
            label="Déconnexion"
            color="neutral"
            variant="ghost"
            @click="logout"
          />
        </div>
      </template>
    </UDashboardSidebar>

    <slot />
  </UDashboardGroup>
</template>
