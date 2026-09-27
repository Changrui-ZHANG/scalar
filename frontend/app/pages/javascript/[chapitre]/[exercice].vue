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
const chapterSlug = computed(() => String(route.params.chapitre))
const slug = computed(() => String(route.params.exercice))

const { data, error } = await useFetch<ApiResponse<PublicExercise>>(
  () => apiUrl(`/exercises/${encodeURIComponent(slug.value)}`),
  { key: `exercise-${slug.value}` },
)

// Un exercice atteint par le mauvais chapitre est un lien casse, pas une page.
if (
  error.value?.statusCode === 404 ||
  (data.value?.data && data.value.data.chapter.slug !== chapterSlug.value)
) {
  throw createError({ statusCode: 404, statusMessage: 'Exercice introuvable', fatal: true })
}

const exercise = computed(() => data.value?.data ?? null)

useSeoMeta({
  title: () => `${exercise.value?.title ?? 'Exercice'} — JavaScript — Scalar`,
})

const { statusOf, savedCode, saveCode, markAttempted } = useProgress()
const { public: publicConfig } = useRuntimeConfig()

const code = ref(exercise.value?.starterCode ?? '')
const revealedHints = ref(0)
const running = ref(false)
const runError = ref('')
const result = ref<ExecutionResult | null>(null)

// Le code sauvegarde n'est lisible qu'une fois dans le navigateur.
onMounted(() => {
  code.value = savedCode(slug.value) ?? code.value
})

watch(code, (value) => {
  if (exercise.value && value !== exercise.value.starterCode) {
    saveCode(slug.value, value)
  }
})

function resetCode() {
  code.value = exercise.value?.starterCode ?? ''
}

async function run() {
  if (running.value || code.value.trim() === '') {
    return
  }
  running.value = true
  runError.value = ''
  result.value = null

  try {
    const response = await $fetch<ApiResponse<ExecutionResult>>(
      `${publicConfig.apiBase}/executions`,
      { method: 'POST', body: { code: code.value } },
    )
    result.value = response.data
    markAttempted(slug.value, code.value)
  } catch (err: unknown) {
    runError.value = apiErrorMessage(err, 'Le service est injoignable pour l’instant.')
  } finally {
    running.value = false
  }
}
</script>

<template>
  <section class="grid gap-8 py-8">
    <nav class="text-body-sm text-muted-foreground flex gap-2">
      <NuxtLink to="/javascript" class="underline">JavaScript</NuxtLink>
      <span aria-hidden="true">/</span>
      <NuxtLink v-if="exercise" :to="`/javascript/${exercise.chapter.slug}`" class="underline">
        {{ exercise.chapter.title }}
      </NuxtLink>
    </nav>

    <p
      v-if="error"
      role="alert"
      class="rounded-md border border-red-500/50 p-3 text-red-600 dark:text-red-400"
    >
      {{ apiErrorMessage(error, 'L’exercice est injoignable pour l’instant.') }}
    </p>

    <template v-if="exercise">
      <header class="flex flex-wrap items-baseline justify-between gap-2">
        <h1 class="font-display text-3xl">{{ exercise.title }}</h1>
        <span class="text-body-sm text-muted-foreground">
          {{ STATUS_LABELS[statusOf(exercise.slug)] }}
        </span>
      </header>

      <div class="grid gap-8 lg:grid-cols-2">
        <div class="grid content-start gap-6">
          <RichText :source="exercise.statement" />

          <div class="grid gap-2">
            <h2 class="text-title">Cas de test</h2>
            <ul class="grid gap-1 font-mono text-sm">
              <li v-for="(test, i) in exercise.tests" :key="i">
                {{ formatCall(exercise.functionName, test.args) }} →
                {{ JSON.stringify(test.expected) }}
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
            <code class="font-mono">console.log({{ formatCall(exercise.functionName, exercise.tests[0]?.args ?? []) }})</code>.
            La correction automatique arrive bientôt.
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
        :to="`/javascript/${exercise.next.chapterSlug}/${exercise.next.slug}`"
        class="justify-self-end rounded-md border px-4 py-2 font-semibold"
      >
        Exercice suivant →
      </NuxtLink>
      <NuxtLink v-else to="/javascript" class="justify-self-end rounded-md border px-4 py-2">
        Retour au parcours
      </NuxtLink>
    </template>
  </section>
</template>
