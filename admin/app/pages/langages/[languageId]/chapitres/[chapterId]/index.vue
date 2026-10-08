<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

const store = useContentStore()
const language = useRouteLanguage()
const chapter = useRouteChapter(language)

useSeoMeta({ title: `${chapter.title} — Backoffice Scalar` })

const back = `/langages/${language.id}`
const exercises = computed(() => store.exercisesOf(chapter.id))

const columns: TableColumn<Exercise>[] = [
  { accessorKey: 'position', header: 'N°' },
  { accessorKey: 'title', header: 'Exercice' },
  { accessorKey: 'functionName', header: 'Fonction' },
  { id: 'tests', header: 'Cas de test' },
  { accessorKey: 'status', header: 'Statut' },
]
</script>

<template>
  <UDashboardPanel :id="`chapitre-${chapter.id}`">
    <template #header>
      <UDashboardNavbar :title="`${language.label} · ${chapter.title}`">
        <template #leading>
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            :aria-label="`Retour à ${language.label}`"
            :to="back"
          />
        </template>
        <template #right>
          <UButton
            icon="i-lucide-pencil"
            label="Modifier"
            color="neutral"
            variant="outline"
            :to="`${back}/chapitres/${chapter.id}/modifier`"
          />
          <UButton
            icon="i-lucide-plus"
            label="Nouvel exercice"
            :to="`${back}/chapitres/${chapter.id}/exercices/nouveau`"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="grid gap-1">
        <div class="flex items-center gap-3">
          <span class="text-muted text-sm tabular-nums">Chapitre {{ chapter.position }}</span>
          <code class="text-sm">{{ chapter.slug }}</code>
          <StatusBadge :status="chapter.status" />
        </div>
        <p class="text-muted">{{ chapter.summary }}</p>
      </div>

      <UTable :data="exercises" :columns="columns" empty="Aucun exercice : créez le premier.">
        <template #position-cell="{ row }">
          <span class="text-muted tabular-nums">{{ row.original.position }}</span>
        </template>
        <template #title-cell="{ row }">
          <ULink
            :to="`${back}/chapitres/${chapter.id}/exercices/${row.original.id}`"
            class="font-medium"
          >
            {{ row.original.title }}
          </ULink>
          <code class="text-muted ms-2 text-xs">{{ row.original.slug }}</code>
        </template>
        <template #functionName-cell="{ row }">
          <code class="text-sm">{{ row.original.functionName }}()</code>
        </template>
        <template #tests-cell="{ row }">
          <span class="tabular-nums">{{ row.original.testCases.length }}</span>
        </template>
        <template #status-cell="{ row }">
          <StatusBadge :status="row.original.status" />
        </template>
      </UTable>
    </template>
  </UDashboardPanel>
</template>
