<script setup lang="ts">
const store = useContentStore()
const track = await useRouteTrack()
const chapter = await useRouteChapter(track)
const exercise = ref(await useRouteExercise(chapter))
const toast = useToast()

useSeoMeta({ title: `Modifier ${exercise.value.title} — Backoffice Scalar` })

const back = `/parcours/${track.id}/chapitres/${chapter.id}`
const initial = toExerciseInput(exercise.value)

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
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <SolutionCheckPanel :exercise="exercise" @checked="exercise = $event" />
      <ExerciseForm
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
