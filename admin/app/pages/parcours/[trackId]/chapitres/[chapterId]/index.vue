<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

const store = useContentStore()
const track = await useRouteTrack()
const chapter = await useRouteChapter(track)
await store.loadExercises(chapter.id)

useSeoMeta({ title: `${chapter.title} — Backoffice Scalar` })

const back = `/parcours/${track.id}`
const base = `${back}/chapitres/${chapter.id}`

const columns: TableColumn<Exercise>[] = [
  { accessorKey: 'position', header: 'N°' },
  { accessorKey: 'title', header: 'Exercice' },
  { accessorKey: 'functionName', header: 'Fonction' },
  { id: 'tests', header: 'Cas de test' },
  { accessorKey: 'solutionCheckStatus', header: 'Solution' },
  { accessorKey: 'status', header: 'Statut' },
  { id: 'actions', header: '' },
]

function replaceExercise(updated: Exercise) {
  store.exercises = store.exercises.map((e) => (e.id === updated.id ? updated : e))
}
</script>

<template>
  <UDashboardPanel :id="`chapitre-${chapter.id}`">
    <template #header>
      <UDashboardNavbar :title="`${track.name} · ${chapter.title}`">
        <template #leading>
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            :aria-label="`Retour à ${track.name}`"
            :to="back"
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
            v-if="track.programmingLanguage"
            icon="i-lucide-plus"
            label="Nouvel exercice"
            :to="`${base}/exercices/nouveau`"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="grid gap-1">
        <div class="flex items-center gap-3">
          <span class="text-muted text-sm">
            {{ LEVEL_LABELS[chapter.level] }}, chapitre {{ chapter.position }}
          </span>
          <code class="text-sm">{{ chapter.slug }}</code>
          <StatusBadge :status="chapter.status" />
        </div>
        <p class="text-muted">{{ chapter.summary }}</p>
      </div>

      <UTable :data="[...store.exercises]" :columns="columns" empty="Aucun exercice.">
        <template #position-cell="{ row }">
          <span class="text-muted tabular-nums">{{ row.original.position }}</span>
        </template>
        <template #title-cell="{ row }">
          <ULink :to="`${base}/exercices/${row.original.id}`" class="font-medium">
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
        <template #solutionCheckStatus-cell="{ row }">
          <SolutionCheckBadge :status="row.original.solutionCheckStatus" />
        </template>
        <template #status-cell="{ row }">
          <StatusBadge :status="row.original.status" />
        </template>
        <template #actions-cell="{ row }">
          <ExerciseRowActions
            :exercise="row.original"
            :edit-to="`${base}/exercices/${row.original.id}`"
            @updated="replaceExercise"
          />
        </template>
      </UTable>
    </template>
  </UDashboardPanel>
</template>
