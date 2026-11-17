<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

const store = useContentStore()
const track = await useRouteTrack()
const chapter = await useRouteChapter(track)
await Promise.all([store.loadLessons(chapter.id), store.loadExercises(chapter.id)])

useSeoMeta({ title: `${chapter.title} — Backoffice Scalar` })

const crumbs = breadcrumb({ track, chapter })

const back = `/parcours/${track.id}`
const base = `${back}/chapitres/${chapter.id}`

const lessonColumns: TableColumn<Lesson>[] = [
  { accessorKey: 'position', header: 'N°' },
  { accessorKey: 'title', header: 'Leçon' },
  { accessorKey: 'summary', header: 'Résumé' },
  { accessorKey: 'status', header: 'Statut' },
]

const columns: TableColumn<Exercise>[] = [
  { accessorKey: 'position', header: 'N°' },
  { accessorKey: 'title', header: 'Exercice' },
  { accessorKey: 'functionName', header: 'Fonction' },
  { id: 'tests', header: 'Cas de test' },
  { accessorKey: 'solutionCheckStatus', header: 'Solution' },
  { accessorKey: 'status', header: 'Statut' },
  { id: 'actions', header: '' },
]

const { generate, generating } = useExerciseGeneration(chapter.id)
const topic = ref('')

async function onGenerate() {
  if (!topic.value.trim() || generating.value) {
    return
  }
  const draft = await generate(topic.value)
  if (draft) {
    await navigateTo(`${base}/exercices/${draft.id}`)
  }
}

function replaceExercise(updated: Exercise) {
  store.exercises = store.exercises.map((e) => (e.id === updated.id ? updated : e))
}
</script>

<template>
  <UDashboardPanel :id="`chapitre-${chapter.id}`">
    <template #header>
      <UDashboardNavbar>
        <template #title>
          <AdminBreadcrumb :items="crumbs" />
        </template>
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
            icon="i-lucide-plus"
            label="Nouvelle leçon"
            color="neutral"
            variant="outline"
            :to="`${base}/lecons/nouveau`"
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

      <h2 class="font-semibold">Leçons</h2>
      <UTable :data="[...store.lessons]" :columns="lessonColumns" empty="Aucune leçon.">
        <template #position-cell="{ row }">
          <span class="text-muted tabular-nums">{{ row.original.position }}</span>
        </template>
        <template #title-cell="{ row }">
          <ULink :to="`${base}/lecons/${row.original.id}`" class="font-medium">
            {{ row.original.title }}
          </ULink>
          <code class="text-muted ms-2 text-xs">{{ row.original.slug }}</code>
        </template>
        <template #summary-cell="{ row }">
          <span class="text-muted">{{ row.original.summary }}</span>
        </template>
        <template #status-cell="{ row }">
          <StatusBadge :status="row.original.status" />
        </template>
      </UTable>

      <h2 class="font-semibold">Exercices</h2>
      <div v-if="track.programmingLanguage" class="flex max-w-2xl gap-2">
        <UInput
          v-model="topic"
          placeholder="Titre d’un exercice, par ex. « Somme des nombres pairs »"
          aria-label="Titre de l’exercice à générer"
          class="w-full"
          @keydown.enter="onGenerate"
        />
        <UButton
          icon="i-lucide-sparkles"
          label="Générer avec l’IA"
          color="neutral"
          variant="outline"
          class="shrink-0"
          :loading="generating"
          :disabled="!topic.trim() || generating"
          @click="onGenerate"
        />
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
