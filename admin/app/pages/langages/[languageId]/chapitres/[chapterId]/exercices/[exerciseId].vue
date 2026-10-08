<script setup lang="ts">
const store = useContentStore()
const language = useRouteLanguage()
const chapter = useRouteChapter(language)
const exercise = useRouteExercise(chapter)
const toast = useToast()

useSeoMeta({ title: `Modifier ${exercise.title} — Backoffice Scalar` })

const back = `/langages/${language.id}/chapitres/${chapter.id}`
const initial = toExerciseInput(exercise)

function onSaved(saved: Exercise) {
  toast.add({ title: `Exercice « ${saved.title} » enregistré`, color: 'success' })
  return navigateTo(back)
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
      </UDashboardNavbar>
    </template>

    <template #body>
      <ExerciseForm
        :initial="initial"
        :save="(input) => store.updateExercise(exercise.id, input)"
        submit-label="Enregistrer"
        :cancel-to="back"
        :code-language="language.runtime === 'node_strip_types' ? 'typescript' : 'javascript'"
        editing
        @saved="onSaved"
      />
    </template>
  </UDashboardPanel>
</template>
