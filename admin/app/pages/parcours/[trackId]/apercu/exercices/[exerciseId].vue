<script setup lang="ts">
const store = useContentStore()
const toast = useToast()
const track = await useRouteTrack()
const { exercise, previous, next } = await useRoutePreviewExercise(track)

useSeoMeta({ title: `Tester ${exercise.title} — Backoffice Scalar` })

const base = `/parcours/${track.id}/apercu`
const demo = useRoute().query.demo === '1'
const linkTo = (target: Exercise) => ({
  path: `${base}/exercices/${target.id}`,
  query: demo ? { demo: '1' } : {},
})
const code = ref(exercise.starterCode)
const editUrl = {
  path: `/parcours/${track.id}/chapitres/${exercise.chapterId}/exercices/${exercise.id}`,
  query: demo ? { demo: '1' } : {},
}
const shownHints = ref(0)
const running = ref(false)
const verdict = ref<Verification | null>(null)

async function run() {
  running.value = true
  const result = await store.tryExercise(exercise.id, code.value)
  running.value = false
  if (!result.ok) {
    verdict.value = null
    toast.add({ title: result.message, color: 'error' })
    return
  }
  verdict.value = result.data
}

const consoleOutput = computed(() =>
  verdict.value ? `${verdict.value.execution.run.stdout}${verdict.value.execution.run.stderr}` : '',
)
</script>

<template>
  <UDashboardPanel :id="`apercu-exercice-${exercise.id}`">
    <template #header>
      <UDashboardNavbar :title="`Tester · ${exercise.title}`">
        <template #leading>
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            :aria-label="`Retour à l’aperçu de ${track.name}`"
            :to="base"
          />
        </template>
        <template #right>
          <UBadge v-if="demo" color="primary" variant="subtle" label="Mode DEMO" />
          <StatusBadge v-if="exercise.status !== 'published'" :status="exercise.status" />
          <UButton
            icon="i-lucide-pencil"
            label="Modifier"
            color="neutral"
            variant="outline"
            :to="editUrl"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="grid max-w-5xl gap-5">
        <MarkdownPreview :source="exercise.instructions" />

        <div v-if="exercise.hints.length > 0" class="grid gap-2">
          <p v-for="(hint, i) in exercise.hints.slice(0, shownHints)" :key="i" class="text-sm">
            <span class="font-medium">Indice {{ i + 1 }} :</span> {{ hint }}
          </p>
          <div v-if="shownHints < exercise.hints.length">
            <UButton
              icon="i-lucide-lightbulb"
              label="Afficher un indice"
              size="sm"
              color="neutral"
              variant="outline"
              @click="shownHints += 1"
            />
          </div>
        </div>

        <CodeField
          v-model="code"
          :language="track.programmingLanguage ?? 'javascript'"
          label="Ton code"
        />
        <div class="flex gap-3">
          <UButton icon="i-lucide-play" label="Exécuter" :loading="running" @click="run" />
          <UButton
            v-if="demo"
            icon="i-lucide-key-round"
            label="Réponse"
            color="neutral"
            variant="outline"
            @click="code = exercise.solutionCode"
          />
        </div>

        <section v-if="verdict" class="border-default grid gap-3 rounded-lg border p-4">
          <h2 class="font-medium">
            {{ verdict.passed ? 'Réussi' : 'Pas encore' }} · {{ verdict.passedCount }} /
            {{ verdict.total }}
          </h2>
          <VerdictList :checks="verdict.checks" />
          <pre
            v-if="consoleOutput"
            class="bg-elevated overflow-x-auto rounded-md p-3 text-xs whitespace-pre-wrap"
            >{{ consoleOutput }}</pre>
        </section>

        <nav class="flex justify-between gap-3">
          <UButton
            v-if="previous"
            icon="i-lucide-arrow-left"
            label="Précédent"
            color="neutral"
            variant="ghost"
            :to="linkTo(previous)"
          />
          <span v-else />
          <UButton
            v-if="next"
            trailing-icon="i-lucide-arrow-right"
            label="Suivant"
            color="neutral"
            variant="ghost"
            :to="linkTo(next)"
          />
          <UButton
            v-else-if="demo"
            trailing-icon="i-lucide-flag"
            label="Fin de la démo"
            color="neutral"
            variant="ghost"
            to="/parcours"
          />
        </nav>
      </div>
    </template>
  </UDashboardPanel>
</template>
