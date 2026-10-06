<script setup lang="ts">
/**
 * Page d'exercice : consigne, editeur, execution, verification, aide.
 *
 * Executer montre ce que produit le programme et ne termine rien. Seule la
 * verification juge la solution : l'exercice n'est termine que si tous ses
 * criteres passent.
 */
const route = useRoute()
const languageSlug = computed(() => String(route.params.langage))
const chapterSlug = computed(() => String(route.params.chapitre))
const exerciseSlug = computed(() => String(route.params.exercice))

const apiPath = computed(
  () =>
    `/languages/${seg(languageSlug.value)}/chapters/${seg(chapterSlug.value)}/exercises/${seg(exerciseSlug.value)}`,
)

const { data, error } = await useFetch<ApiResponse<PublicExercise>>(() => apiUrl(apiPath.value), {
  key: () => `exercise-${languageSlug.value}-${chapterSlug.value}-${exerciseSlug.value}`,
})
// Le chemin complet suffit : l'API repond 404 hors de la bonne hierarchie.
if (error.value?.statusCode === 404) {
  throw createError({ statusCode: 404, statusMessage: 'Exercice introuvable', fatal: true })
}

const exercise = computed(() => data.value?.data ?? null)
const { episodes, progress } = await useTrackEpisodes(() => languageSlug.value)

const key = computed(() => exerciseKey(chapterSlug.value, exerciseSlug.value))
const episode = computed(() => episodes.value.find((e) => e.key === key.value) ?? null)
const next = computed(() => nextEpisode(episodes.value, key.value))
const lesson = computed(() => relatedLesson(episodes.value, key.value))
const completed = computed(() => episode.value?.status === 'completed')
const trackRoute = computed(() => `/parcours/${languageSlug.value}`)

useSeoMeta({
  title: () =>
    `${exercise.value?.title ?? 'Exercice'} — ${exercise.value?.language.label ?? ''} — Scalar`,
  description: () => exercise.value?.statement.replaceAll('`', '') ?? '',
})

// --- Code et brouillon ---------------------------------------------------------

const draftKey = computed(() => `${languageSlug.value}/${key.value}`)
const code = ref(exercise.value?.starterCode ?? '')

// Le brouillon n'est lisible qu'une fois dans le navigateur.
onMounted(() => {
  progress.start(languageSlug.value)
  code.value = progress.draft(draftKey.value) ?? code.value
})

watch(code, (value) => {
  if (exercise.value && value !== exercise.value.starterCode) {
    progress.saveDraft(draftKey.value, value)
  }
})

function resetCode() {
  code.value = exercise.value?.starterCode ?? ''
}

// --- Executer / verifier ---------------------------------------------------------

const execution = useExecution()
const validation = useExerciseValidation(() => apiPath.value)

/** La sortie affichee est celle de la derniere action, execution ou verification. */
const lastAction = ref<'run' | 'verify' | null>(null)
const busy = computed(() => execution.running.value || validation.verifying.value)

const output = computed(() =>
  lastAction.value === 'run'
    ? execution.result.value
    : (validation.verification.value?.execution ?? null),
)
const actionError = computed(() =>
  lastAction.value === 'run' ? execution.error.value : validation.error.value,
)

async function run() {
  if (!exercise.value) {
    return
  }
  lastAction.value = 'run'
  // Le langage de l'exercice, jamais celui de l'URL : il decide de la preparation du code.
  await execution.run(code.value, exercise.value.language.slug)
}

async function verify() {
  lastAction.value = 'verify'
  const result = await validation.verify(code.value)
  if (result?.passed) {
    progress.complete(languageSlug.value, key.value)
  }
}

const justPassed = computed(
  () => lastAction.value === 'verify' && validation.verification.value?.passed === true,
)

// --- Mise en page ------------------------------------------------------------------

const showHelp = ref(true)

const crumbs = computed(() => {
  const e = episode.value
  const x = exercise.value
  return [
    { label: 'Parcours', to: '/parcours' },
    { label: x?.language.label ?? 'Parcours', to: trackRoute.value },
    {
      label: x ? `Chapitre ${x.chapter.number} — ${x.chapter.title}` : 'Chapitre',
      to: `${trackRoute.value}#${chapterSlug.value}`,
    },
    { label: e ? `${padNumber(e.number)} · Exercice — ${e.title}` : (x?.title ?? 'Exercice') },
  ]
})
</script>

<template>
  <div class="grid gap-8 py-10">
    <BreadcrumbTrail :items="crumbs" />

    <p v-if="error" role="alert" class="alert-error">
      {{ apiErrorMessage(error, 'L’exercice est injoignable pour l’instant.') }}
    </p>

    <template v-if="exercise">
      <header class="flex flex-wrap items-end justify-between gap-4">
        <div class="grid justify-items-start gap-2">
          <EpisodeBadge type="exercise" />
          <h1 class="text-4xl font-semibold">{{ exercise.title }}</h1>
          <p class="text-muted-foreground">
            <template v-if="episode">
              Épisode {{ padNumber(episode.number) }} sur {{ episodes.length }} ·
            </template>
            Chapitre {{ exercise.chapter.number }} — {{ exercise.chapter.title }}
            <template v-if="completed">
              · <span class="text-success font-semibold">Terminé</span>
            </template>
          </p>
        </div>
        <button
          type="button"
          class="btn-secondary"
          aria-controls="aide"
          :aria-expanded="showHelp"
          @click="showHelp = !showHelp"
        >
          {{ showHelp ? 'Masquer l’aide' : 'Afficher l’aide' }}
        </button>
      </header>

      <div
        class="grid items-start gap-6"
        :class="showHelp ? 'lg:grid-cols-[minmax(0,1fr)_22rem]' : ''"
      >
        <div class="grid min-w-0 gap-6">
          <section class="card grid gap-5 p-5 sm:p-6" aria-labelledby="mission-titre">
            <div class="grid gap-2">
              <h2 id="mission-titre" class="eyebrow font-sans">Votre mission</h2>
              <RichText :source="exercise.statement" class="font-semibold" />
              <p class="text-body-sm text-muted-foreground">
                Exécutez votre code pour observer sa sortie, puis vérifiez la solution avec les
                tests.
              </p>
              <details v-if="exercise.testCases.length" class="text-body-sm">
                <summary class="min-h-11 cursor-pointer content-center font-semibold">
                  Voir les cas de test ({{ exercise.testCases.length }})
                </summary>
                <ul class="grid gap-1 pt-1 font-mono">
                  <li v-for="(test, i) in exercise.testCases" :key="i">
                    {{ formatCall(exercise.functionName, test.args) }} →
                    {{ JSON.stringify(test.expected) }}
                  </li>
                </ul>
              </details>
            </div>

            <form class="grid gap-3" @submit.prevent="run">
              <CodeEditor
                id="code"
                v-model="code"
                label="Votre code"
                :filename="exercise.language.runtime === 'node_strip_types' ? 'main.ts' : 'main.js'"
              />
              <!-- Le moteur retire les types sans les verifier (runtime node_strip_types). -->
              <p
                v-if="exercise.language.runtime === 'node_strip_types'"
                class="text-body-sm text-muted-foreground"
              >
                Les annotations de type sont retirées avant l’exécution : une erreur de type n’est
                pas encore signalée.
              </p>
              <div class="flex flex-wrap gap-2">
                <button type="submit" class="btn-secondary" :disabled="busy || !code.trim()">
                  {{ execution.running.value ? 'Exécution…' : 'Exécuter' }}
                </button>
                <button
                  type="button"
                  class="btn-primary"
                  :disabled="busy || !code.trim()"
                  @click="verify"
                >
                  {{ validation.verifying.value ? 'Vérification…' : 'Vérifier la solution' }}
                </button>
                <button type="button" class="btn ml-auto border-transparent" @click="resetCode">
                  Réinitialiser
                </button>
              </div>
            </form>
          </section>

          <div class="grid gap-4" aria-live="polite">
            <p v-if="actionError" role="alert" class="alert-error">{{ actionError }}</p>
            <ExecutionOutput v-if="output" :result="output" />
            <TestResults
              v-if="lastAction === 'verify' && validation.verification.value"
              :verification="validation.verification.value"
            />

            <template v-if="justPassed || (completed && lastAction === null)">
              <section
                class="bg-success-soft border-success/30 grid gap-1 rounded-2xl border p-6"
                aria-labelledby="termine-titre"
              >
                <h2 id="termine-titre" class="text-success text-2xl font-semibold">
                  {{ next ? 'Exercice terminé' : 'Parcours terminé' }}
                </h2>
                <p>
                  {{
                    next
                      ? 'Tous les critères sont validés. Votre progression est enregistrée.'
                      : `Vous avez terminé tous les épisodes de ${exercise.language.label}.`
                  }}
                </p>
              </section>
              <NextEpisodeCard
                v-if="next"
                eyebrow="Épisode suivant"
                :episode="next"
                :action-label="`Continuer : ${next.title}`"
              />
              <NuxtLink :to="trackRoute" class="btn-secondary justify-self-start">
                Retour au fil
              </NuxtLink>
            </template>
          </div>
        </div>

        <div v-show="showHelp" id="aide" class="lg:sticky lg:top-24">
          <ExerciseHelp :key="key" :lesson="lesson" :hints="exercise.hints" />
        </div>
      </div>
    </template>
  </div>
</template>
