<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const NAVIGATION: NavigationMenuItem[] = [
  { label: 'Langages', icon: 'i-lucide-languages', to: '/langages' },
]
</script>

<template>
  <UDashboardGroup>
    <UDashboardSidebar collapsible>
      <template #header>
        <span class="font-semibold">Scalar · Backoffice</span>
      </template>
      <UNavigationMenu :items="NAVIGATION" orientation="vertical" />
    </UDashboardSidebar>

    <slot />
  </UDashboardGroup>
</template>
