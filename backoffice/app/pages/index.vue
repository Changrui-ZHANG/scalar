<script setup lang="ts">
interface TableSummary {
  name: string
  rowCount: number
}

const { data: tables, error } = await useFetch<TableSummary[]>('/api/tables', {
  default: () => [],
})
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Tables" />
    </template>

    <template #body>
      <UAlert
        v-if="error"
        color="error"
        icon="i-lucide-database-zap"
        title="Base injoignable"
        :description="error.statusMessage ?? error.message"
      />
      <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ULink v-for="table in tables" :key="table.name" :to="`/tables/${table.name}`">
          <UCard class="hover:bg-elevated/50">
            <p class="font-mono font-medium">{{ table.name }}</p>
            <p class="text-muted text-sm">{{ table.rowCount }} ligne(s)</p>
          </UCard>
        </ULink>
      </div>
    </template>
  </UDashboardPanel>
</template>
