<script setup lang="ts">
interface Column {
  name: string
  type: string
  nullable: boolean
}

interface TablePage {
  page: number
  pageSize: number
  total: number
  columns: Column[]
  rows: Record<string, unknown>[]
}

const PAGE_SIZE = 50

const route = useRoute()
const table = computed(() => String(route.params.table))
const page = ref(1)

const { data, error, status } = await useFetch<TablePage>(() => `/api/tables/${table.value}`, {
  query: { page, pageSize: PAGE_SIZE },
})

const columns = computed(() =>
  (data.value?.columns ?? []).map((column) => ({
    accessorKey: column.name,
    header: column.name,
    meta: { class: { th: 'font-mono', td: 'font-mono text-xs' } },
  })),
)

// Ligne ouverte dans le panneau latéral, pour lire une valeur en entier.
const selected = ref<Record<string, unknown>>()
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="table">
        <template #right>
          <span v-if="data" class="text-muted text-sm">{{ data.total }} ligne(s)</span>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UAlert
        v-if="error"
        color="error"
        icon="i-lucide-circle-alert"
        :title="error.statusMessage ?? error.message"
      />
      <template v-else-if="data">
        <UTable
          :data="data.rows"
          :columns="columns"
          :loading="status === 'pending'"
          sticky
          class="flex-1"
          @select="(_event, row) => (selected = row.original)"
        >
          <template
            v-for="column in data.columns"
            :key="column.name"
            #[`${column.name}-cell`]="{ row }"
          >
            <span :class="{ 'text-dimmed': row.original[column.name] == null }">
              {{ truncate(formatCell(row.original[column.name])) }}
            </span>
          </template>
        </UTable>

        <div class="border-default flex justify-end border-t pt-4">
          <UPagination v-model:page="page" :items-per-page="PAGE_SIZE" :total="data.total" />
        </div>
      </template>

      <USlideover
        :open="selected !== undefined"
        :title="`${table} #${selected?.id ?? ''}`"
        @update:open="(open) => !open && (selected = undefined)"
      >
        <template #body>
          <dl v-if="selected && data" class="space-y-4">
            <div v-for="column in data.columns" :key="column.name">
              <dt class="text-muted font-mono text-xs">
                {{ column.name }} <span class="text-dimmed">· {{ column.type }}</span>
              </dt>
              <dd class="font-mono text-sm break-words whitespace-pre-wrap">
                {{ formatCell(selected[column.name]) }}
              </dd>
            </div>
          </dl>
        </template>
      </USlideover>
    </template>
  </UDashboardPanel>
</template>
