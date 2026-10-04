<script setup lang="ts">
/**
 * Page d'exercice : enonce, editeur, indices et cas de test.
 *
 * La correction automatique n'existe pas encore cote backend : le bouton
 * execute le code tel quel, comme le bac a sable.
 */

interface ExecutionResult {
  readonly label: string
  readonly run: { readonly stdout: string; readonly stderr: string }
}

const route = useRoute()
const languageSlug = computed(() => String(route.params.langage))
const chapterSlug = computed(() => String(route.params.chapitre))
const exerciseSlug = computed(() => String(route.params.exercice))

const { data, error } = await useFetch<ApiResponse<PublicExercise>>(
  () =>
    apiUrl(
      `/languages/${seg(languageSlug.value)}/chapters/${seg(chapterSlug.value)}/exercises/${seg(exerciseSlug.value)}`,
    ),
  { key: `exercise-${languageSlug.value}-${chapterSlug.value}-${exerciseSlug.value}` },
)

// Le chemin complet suffit : l'API repond 404 hors de la bonne hierarchie.
if (error.value?.statusCode === 404) {
  throw createError({ statusCode: 404, statusMessage: 'Exercice introuvable', fatal: true })
}

const exercise = computed(() => data.value?.data ?? null)

useSeoMeta({
  title: () =>
    `${exercise.value?.title ?? 'Exercice'} — ${exercise.value?.language.label} — Scalar`,
})

// Un slug d'exercice n'est unique que dans son chapitre : la cle porte le chemin.
const progressKey = computed(() =>
  exerciseKey(languageSlug.value, chapterSlug.value, exerciseSlug.value),
)
const { statusOf, savedCode, saveCode, markAttempted } = useProgress()
const { public: publicConfig } = useRuntimeConfig()

const code = ref(exercise.value?.starterCode ?? '')
const revealedHints = ref(0)
const running = ref(false)
const runError = ref('')
const result = ref<ExecutionResult | null>(null)

// Le code sauvegarde n'est lisible qu'une fois dans le navigateur.
onMounted(() => {
  code.value = savedCode(progressKey.value) ?? code.value
})

watch(code, (value) => {
  if (exercise.value && value !== exercise.value.starterCode) {
    saveCode(progressKey.value, value)
  }
})

function resetCode() {
  code.value = exercise.value?.starterCode ?? ''
}

async function run() {
  if (running.value || code.value.trim() === '' || !exercise.value) {
    return
  }
  running.value = true
  runError.value = ''
  result.value = null

  try {
    const response = await $fetch<ApiResponse<ExecutionResult>>(
      `${publicConfig.apiBase}/executions`,
      // Le langage de l'exercice, jamais celui de l'URL : c'est lui qui decide
      // de la preparation du code avant execution.
      { method: 'POST', body: { code: code.value, language: exercise.value.language.slug } },
    )
    result.value = response.data
    markAttempted(progressKey.value, code.value)
  } catch (err: unknown) {
    runError.value = apiErrorMessage(err, 'Le service est injoignable pour l’instant.')
  } finally {
    running.value = false
  }
}
</script>

<template>
  <section class="grid gap-8 py-8">
    <BreadcrumbTrail
      :items="[
        { label: 'Parcours', to: '/parcours' },
        { label: exercise?.language.label ?? '', to: `/parcours/${languageSlug}` },
        {
          label: exercise ? `${exercise.chapter.number}. ${exercise.chapter.title}` : 'Chapitre',
          to: `/parcours/${languageSlug}/${chapterSlug}`,
        },
        { label: exercise?.title ?? 'Exercice' },
      ]"
    />

    <p
      v-if="error"
      role="alert"
      class="rounded-md border border-red-500/50 p-3 text-red-600 dark:text-red-400"
    >
      {{ apiErrorMessage(error, 'L’exercice est injoignable pour l’instant.') }}
    </p>

    <template v-if="exercise">
      <header class="flex flex-wrap items-baseline justify-between gap-2">
        <div class="grid gap-1">
          <p class="text-body-sm text-muted-foreground">
            Exercice {{ exercise.chapter.number }}.{{ exercise.number }}
          </p>
          <h1 class="font-display text-3xl">{{ exercise.title }}</h1>
        </div>
        <span class="text-body-sm text-muted-foreground">
          {{ STATUS_LABELS[statusOf(progressKey)] }}
        </span>
      </header>

      <div class="grid gap-8 lg:grid-cols-2">
        <div class="grid content-start gap-6">
          <RichText :source="exercise.statement" />

          <div class="grid gap-2">
            <h2 class="text-title">Cas de test</h2>
            <ul class="grid gap-1 font-mono text-sm">
              <li v-for="(test, i) in exercise.testCases" :key="i">
                {{ formatCall(exercise.functionName, test.args) }} →
                {{ JSON.stringify(test.expected) }}
                <span v-if="test.label" class="text-muted-foreground font-sans">
                  ({{ test.label }})
                </span>
              </li>
            </ul>
          </div>

          <div v-if="exercise.hints.length" class="grid gap-2">
            <h2 class="text-title">Indices</h2>
            <ol class="grid gap-2">
              <li
                v-for="(hint, i) in exercise.hints.slice(0, revealedHints)"
                :key="i"
                class="rounded-md border p-3"
              >
                <RichText :source="hint" />
              </li>
            </ol>
            <button
              v-if="revealedHints < exercise.hints.length"
              type="button"
              class="justify-self-start rounded-md border px-3 py-1"
              @click="revealedHints++"
            >
              Voir l’indice {{ revealedHints + 1 }}/{{ exercise.hints.length }}
            </button>
          </div>

          <LessonLinks :language-slug="languageSlug" :chapter-slug="exercise.chapter.slug" />
        </div>

        <form class="grid content-start gap-3" @submit.prevent="run">
          <label for="code" class="text-title">Votre code</label>
          <textarea
            id="code"
            v-model="code"
            rows="14"
            spellcheck="false"
            class="bg-background text-foreground w-full resize-y rounded-md border p-3 font-mono text-sm"
          />
          <p class="text-body-sm text-muted-foreground">
            Pour voir un résultat, appelez votre fonction avec
            <code class="font-mono"
              >console.log({{
                formatCall(exercise.functionName, exercise.testCases[0]?.args ?? [])
              }})</code
            >. La correction automatique arrive bientôt.
          </p>
          <!-- Le moteur retire les types sans les verifier (runtime node_strip_types). -->
          <p
            v-if="exercise.language.runtime === 'node_strip_types'"
            class="text-body-sm text-muted-foreground"
          >
            Les annotations de type sont retirées avant l’exécution : une erreur de type n’est pas
            encore signalée.
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              type="submit"
              :disabled="running || code.trim() === ''"
              class="bg-foreground text-background rounded-md px-4 py-2 font-semibold disabled:opacity-40"
            >
              {{ running ? 'Exécution en cours…' : 'Exécuter' }}
            </button>
            <button type="button" class="rounded-md border px-4 py-2" @click="resetCode">
              Réinitialiser
            </button>
          </div>

          <p
            v-if="runError"
            role="alert"
            class="rounded-md border border-red-500/50 p-3 text-red-600 dark:text-red-400"
          >
            {{ runError }}
          </p>

          <div v-if="result" class="grid gap-2">
            <p class="font-semibold">{{ result.label }}</p>
            <pre
              v-if="result.run.stdout"
              class="overflow-x-auto rounded-md border p-3 font-mono text-sm whitespace-pre-wrap"
              >{{ result.run.stdout }}</pre>
            <pre
              v-if="result.run.stderr"
              class="overflow-x-auto rounded-md border border-red-500/50 p-3 font-mono text-sm whitespace-pre-wrap text-red-600 dark:text-red-400"
              >{{ result.run.stderr }}</pre>
            <p
              v-if="!result.run.stdout && !result.run.stderr"
              class="text-body-sm text-muted-foreground"
            >
              Aucune sortie : la fonction a-t-elle été appelée ?
            </p>
          </div>
        </form>
      </div>

      <NuxtLink
        v-if="exercise.next"
        :to="`/parcours/${languageSlug}/${exercise.next.chapterSlug}/${exercise.next.slug}`"
        class="justify-self-end rounded-md border px-4 py-2 font-semibold"
      >
        Exercice suivant →
      </NuxtLink>
      <NuxtLink
        v-else
        :to="`/parcours/${languageSlug}`"
        class="justify-self-end rounded-md border px-4 py-2"
      >
        Retour au parcours
      </NuxtLink>
    </template>
  </section>
</template>
