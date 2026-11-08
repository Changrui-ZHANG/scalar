<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

const store = useContentStore()
const track = await useRouteTrack()
await store.loadChapters(track.id)

useSeoMeta({ title: `${track.name} — Backoffice Scalar` })

const base = `/parcours/${track.id}`

const columns: TableColumn<Chapter>[] = [
  { accessorKey: 'level', header: 'Niveau' },
  { accessorKey: 'position', header: 'N°' },
  { accessorKey: 'title', header: 'Chapitre' },
  { accessorKey: 'slug', header: 'Slug' },
  { accessorKey: 'status', header: 'Statut' },
]
</script>

<template>
  <UDashboardPanel :id="`parcours-${track.id}`">
    <template #header>
      <UDashboardNavbar :title="track.name">
        <template #leading>
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            aria-label="Retour aux parcours"
            to="/parcours"
          />
        </template>
        <template #right>
          <UButton
            icon="i-lucide-pencil"
            label="Modifier"
            color="neutral"
            variant="outline"
            :to="`${base}/modifier`"
          />
          <UButton
            icon="i-lucide-plus"
            label="Nouveau chapitre"
            :to="`${base}/chapitres/nouveau`"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="grid gap-1">
        <div class="flex items-center gap-3">
          <code class="text-sm">{{ track.slug }}</code>
          <StatusBadge :status="track.status" />
          <span class="text-muted text-sm">
            {{
              track.programmingLanguage
                ? LANGUAGE_LABELS[track.programmingLanguage]
                : NO_LANGUAGE_LABEL
            }}
          </span>
        </div>
        <p class="text-muted">{{ track.summary }}</p>
      </div>

      <UTable
        :data="[...store.chapters]"
        :columns="columns"
        empty="Aucun chapitre : créez le premier."
      >
        <template #level-cell="{ row }">
          {{ LEVEL_LABELS[row.original.level] }}
        </template>
        <template #position-cell="{ row }">
          <span class="text-muted tabular-nums">{{ row.original.position }}</span>
        </template>
        <template #title-cell="{ row }">
          <ULink :to="`${base}/chapitres/${row.original.id}`" class="font-medium">
            {{ row.original.title }}
          </ULink>
        </template>
        <template #slug-cell="{ row }">
          <code class="text-sm">{{ row.original.slug }}</code>
        </template>
        <template #status-cell="{ row }">
          <StatusBadge :status="row.original.status" />
        </template>
      </UTable>
    </template>
  </UDashboardPanel>
</template>
