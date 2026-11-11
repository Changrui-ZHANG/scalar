<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

useSeoMeta({ title: 'Parcours — Backoffice Scalar' })

const store = useContentStore()
await store.loadTracks()

const columns: TableColumn<Track>[] = [
  { accessorKey: 'position', header: 'N°' },
  { accessorKey: 'name', header: 'Parcours' },
  { accessorKey: 'slug', header: 'Slug' },
  { accessorKey: 'programmingLanguage', header: 'Langage' },
  { accessorKey: 'status', header: 'Statut' },
  { id: 'actions', header: '' },
]
</script>

<template>
  <UDashboardPanel id="parcours">
    <template #header>
      <UDashboardNavbar title="Parcours">
        <template #right>
          <UButton icon="i-lucide-plus" label="Nouveau parcours" to="/parcours/nouveau" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UTable :data="[...store.tracks]" :columns="columns" empty="Aucun parcours.">
        <template #position-cell="{ row }">
          <span class="text-muted tabular-nums">{{ row.original.position }}</span>
        </template>
        <template #name-cell="{ row }">
          <ULink :to="`/parcours/${row.original.id}`" class="font-medium">
            {{ row.original.name }}
          </ULink>
        </template>
        <template #slug-cell="{ row }">
          <code class="text-sm">{{ row.original.slug }}</code>
        </template>
        <template #programmingLanguage-cell="{ row }">
          {{
            row.original.programmingLanguage
              ? LANGUAGE_LABELS[row.original.programmingLanguage]
              : NO_LANGUAGE_LABEL
          }}
        </template>
        <template #status-cell="{ row }">
          <StatusBadge :status="row.original.status" />
        </template>
        <template #actions-cell="{ row }">
          <div class="flex justify-end gap-2">
            <UButton
              icon="i-lucide-play"
              label="DEMO"
              size="sm"
              :to="`/parcours/${row.original.id}/demo`"
            />
            <UButton
              label="Ouvrir"
              size="sm"
              color="neutral"
              variant="outline"
              :to="`/parcours/${row.original.id}`"
            />
            <UButton
              label="Modifier"
              size="sm"
              color="neutral"
              variant="outline"
              :to="`/parcours/${row.original.id}/modifier`"
            />
          </div>
        </template>
      </UTable>
    </template>
  </UDashboardPanel>
</template>
