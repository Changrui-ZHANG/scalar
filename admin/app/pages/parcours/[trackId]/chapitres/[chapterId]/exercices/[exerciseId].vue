<script setup lang="ts">
const store = useContentStore()
const track = await useRouteTrack()
const chapter = await useRouteChapter(track)
const exercise = ref(await useRouteExercise(chapter))
const toast = useToast()

useSeoMeta({ title: `Modifier ${exercise.value.title} — Backoffice Scalar` })

const back = `/parcours/${track.id}/chapitres/${chapter.id}`
const initial = toExerciseInput(exercise.value)
const demoUrl =
  useRoute().query.demo === '1'
    ? { path: `/parcours/${track.id}/apercu/exercices/${exercise.value.id}`, query: { demo: '1' } }
    : null

const exerciseForm = useTemplateRef('exerciseForm')

async function saveBeforeCheck(): Promise<Exercise | null> {
  const saved = (await exerciseForm.value?.saveNow()) ?? null
  if (saved) {
    exercise.value = saved
  }
  return saved
}

function onSaved(saved: Exercise) {
  exercise.value = saved
  toast.add({ title: `Exercice « ${saved.title} » enregistré`, color: 'success' })
}
</script>

<template>
  <UDashboardPanel :id="`exercice-${exercise.id}`">
    <template #header>
      <UDashboardNavbar :title="`${chapter.title} · ${exercise.title}`">
        <template #leading>
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            :aria-label="`Retour au chapitre ${chapter.title}`"
            :to="back"
          />
        </template>
        <template #right>
          <StatusBadge :status="exercise.status" />
          <UButton
            v-if="demoUrl"
            icon="i-lucide-undo-2"
            label="Retour à la démo"
            color="neutral"
            variant="outline"
            :to="demoUrl"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <SolutionCheckPanel
        :exercise="exercise"
        :before-check="saveBeforeCheck"
        @checked="exercise = $event"
      />
      <ExerciseForm
        ref="exerciseForm"
        :initial="initial"
        :save="(input) => store.updateExercise(exercise.id, input)"
        submit-label="Enregistrer"
        :cancel-to="back"
        :code-language="track.programmingLanguage ?? 'javascript'"
        editing
        @saved="onSaved"
      />
    </template>
  </UDashboardPanel>
</template>
