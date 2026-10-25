<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

interface TableSummary {
  name: string
  rowCount: number
}

const { data: tables } = await useFetch<TableSummary[]>('/api/tables', { default: () => [] })

const navigation = computed<NavigationMenuItem[]>(() =>
  tables.value.map((table) => ({
    label: table.name,
    icon: 'i-lucide-table',
    badge: String(table.rowCount),
    to: `/tables/${table.name}`,
  })),
)
</script>

<template>
  <UDashboardGroup>
    <UDashboardSidebar collapsible>
      <template #header>
        <span class="font-semibold">Scalar · Backoffice</span>
      </template>
      <UNavigationMenu :items="navigation" orientation="vertical" />
      <template #footer>
        <UBadge color="warning" variant="subtle" icon="i-lucide-eye" label="Lecture seule" />
      </template>
    </UDashboardSidebar>

    <slot />
  </UDashboardGroup>
</template>
