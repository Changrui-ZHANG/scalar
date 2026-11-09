<script setup lang="ts">
const store = useContentStore()
const track = await useRouteTrack()
const chapter = await useRouteChapter(track)
const toast = useToast()

useSeoMeta({ title: `Nouvel exercice · ${chapter.title} — Backoffice Scalar` })

const back = `/parcours/${track.id}/chapitres/${chapter.id}`
const EMPTY: ExerciseInput = {
  title: '',
  slug: '',
  statement: '',
  functionName: '',
  starterCode: '',
  solutionCode: '',
  hints: '',
  testCases: [{ args: '[]', expected: '', label: '', isHidden: false }],
  status: 'draft',
}

function onSaved(exercise: Exercise) {
  toast.add({ title: `Exercice « ${exercise.title} » créé`, color: 'success' })
  return navigateTo(`${back}/exercices/${exercise.id}`)
}
</script>

<template>
  <UDashboardPanel id="nouvel-exercice">
    <template #header>
      <UDashboardNavbar :title="`Nouvel exercice · ${chapter.title}`">
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
        :initial="EMPTY"
        :save="(input) => store.createExercise(chapter.id, input)"
        submit-label="Créer l’exercice"
        :cancel-to="back"
        :code-language="track.programmingLanguage ?? 'javascript'"
        @saved="onSaved"
      >
        <template #note>
          <p class="text-muted text-sm">
            Créé en brouillon, à la fin du chapitre « {{ chapter.title }} ». Vous pourrez ensuite
            vérifier sa solution et le publier.
          </p>
        </template>
      </ExerciseForm>
    </template>
  </UDashboardPanel>
</template>
