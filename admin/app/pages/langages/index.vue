<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

useSeoMeta({ title: 'Langages — Backoffice Scalar' })

const store = useContentStore()

const columns: TableColumn<Language>[] = [
  { accessorKey: 'position', header: 'N°' },
  { accessorKey: 'label', header: 'Langage' },
  { accessorKey: 'slug', header: 'Slug' },
  { accessorKey: 'runtime', header: 'Exécution' },
  { id: 'chapters', header: 'Chapitres' },
  { accessorKey: 'status', header: 'Statut' },
]
</script>

<template>
  <UDashboardPanel id="langages">
    <template #header>
      <UDashboardNavbar title="Langages">
        <template #right>
          <UButton icon="i-lucide-plus" label="Nouveau langage" to="/langages/nouveau" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UTable :data="store.languageList" :columns="columns" empty="Aucun langage.">
        <template #position-cell="{ row }">
          <span class="text-muted tabular-nums">{{ row.original.position }}</span>
        </template>
        <template #label-cell="{ row }">
          <ULink :to="`/langages/${row.original.id}`" class="font-medium">
            {{ row.original.label }}
          </ULink>
        </template>
        <template #slug-cell="{ row }">
          <code class="text-sm">{{ row.original.slug }}</code>
        </template>
        <template #runtime-cell="{ row }">
          {{ RUNTIME_LABELS[row.original.runtime] }}
        </template>
        <template #chapters-cell="{ row }">
          <span class="tabular-nums">{{ store.chaptersOf(row.original.id).length }}</span>
        </template>
        <template #status-cell="{ row }">
          <StatusBadge :status="row.original.status" />
        </template>
      </UTable>
    </template>
  </UDashboardPanel>
</template>
