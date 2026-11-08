<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const NAVIGATION: NavigationMenuItem[] = [
  { label: 'Parcours', icon: 'i-lucide-route', to: '/parcours' },
]

const auth = useAuthStore()

async function logout() {
  await auth.logout()
  return navigateTo('/connexion')
}
</script>

<template>
  <UDashboardGroup>
    <UDashboardSidebar collapsible>
      <template #header>
        <span class="font-semibold">Scalar · Backoffice</span>
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
