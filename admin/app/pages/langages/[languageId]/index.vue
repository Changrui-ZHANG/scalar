<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

const store = useContentStore()
const language = useRouteLanguage()

useSeoMeta({ title: `${language.label} — Backoffice Scalar` })

const base = `/langages/${language.id}`
const chapters = computed(() => store.chaptersOf(language.id))

const columns: TableColumn<Chapter>[] = [
  { accessorKey: 'position', header: 'N°' },
  { accessorKey: 'title', header: 'Chapitre' },
  { accessorKey: 'slug', header: 'Slug' },
  { id: 'exercises', header: 'Exercices' },
  { accessorKey: 'status', header: 'Statut' },
]
</script>

<template>
  <UDashboardPanel :id="`langage-${language.id}`">
    <template #header>
      <UDashboardNavbar :title="language.label">
        <template #leading>
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            aria-label="Retour aux langages"
            to="/langages"
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
          <code class="text-sm">{{ language.slug }}</code>
          <StatusBadge :status="language.status" />
          <span class="text-muted text-sm">{{ RUNTIME_LABELS[language.runtime] }}</span>
        </div>
        <p class="text-muted">{{ language.summary }}</p>
      </div>

      <UTable :data="chapters" :columns="columns" empty="Aucun chapitre : créez le premier.">
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
        <template #exercises-cell="{ row }">
          <span class="tabular-nums">{{ store.exercisesOf(row.original.id).length }}</span>
        </template>
        <template #status-cell="{ row }">
          <StatusBadge :status="row.original.status" />
        </template>
      </UTable>
    </template>
  </UDashboardPanel>
</template>
