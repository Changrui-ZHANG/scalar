<script setup lang="ts">
const store = useContentStore()
const language = useRouteLanguage()
const chapter = useRouteChapter(language)
const toast = useToast()

useSeoMeta({ title: `Nouvel exercice · ${chapter.title} — Backoffice Scalar` })

const back = `/langages/${language.id}/chapitres/${chapter.id}`
const nextPosition = store.exercisesOf(chapter.id).length + 1
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
  return navigateTo(back)
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
        :code-language="language.runtime === 'node_strip_types' ? 'typescript' : 'javascript'"
        @saved="onSaved"
      >
        <template #note>
          <p class="text-muted text-sm">
            Ajouté en fin de chapitre « {{ chapter.title }} », en position {{ nextPosition }}.
          </p>
        </template>
      </ExerciseForm>
    </template>
  </UDashboardPanel>
</template>
