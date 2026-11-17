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

const CHECK_TOASTS = {
  passed: { title: 'Solution de l’IA vérifiée : relisez avant de publier.', color: 'success' },
  failed: { title: 'La solution de l’IA échoue à ses cas de test : à corriger.', color: 'warning' },
  unchecked: { title: 'Moteur injoignable : vérifiez la solution plus tard.', color: 'warning' },
} as const

async function generate(title: string): Promise<Exercise | null> {
  const result = await store.generateExercise(chapter.id, title)
  if (!result.ok) {
    toast.add({ title: result.message, color: 'error' })
    return null
  }
  const check = result.data.solutionCheck
  toast.add(CHECK_TOASTS[check === null ? 'unchecked' : check.passed ? 'passed' : 'failed'])
  return result.data.exercise
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
        :generate="generate"
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
