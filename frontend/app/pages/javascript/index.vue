<script setup lang="ts">
useSeoMeta({
  title: 'Parcours JavaScript — Scalar',
  description: 'Apprendre JavaScript chapitre par chapitre, en écrivant du vrai code.',
})

const { data, error } = await useFetch<ApiResponse<ChapterSummary[]>>(
  () => apiUrl('/languages/javascript/chapters'),
  { key: 'chapters-javascript' },
)

const chapters = computed(() => data.value?.data ?? [])
const { statusOf } = useProgress()

// ponytail: « tente » compte comme fait tant qu'il n'y a pas de verdict
// automatique ; ne garder que « reussi » quand la correction existera.
const isDone = (slug: string) => ['attempted', 'passed'].includes(statusOf(slug))

/** Premier exercice pas encore fait, dans l'ordre du parcours. */
const nextUp = computed(() => {
  for (const chapter of chapters.value) {
    const exercise = chapter.exercises.find((e) => !isDone(e.slug))
    if (exercise) {
      return { chapter, exercise }
    }
  }
  return null
})
</script>

<template>
  <section class="grid gap-8 py-8">
    <header class="grid gap-2">
      <p class="text-body-sm text-muted-foreground">Parcours</p>
      <h1 class="font-display text-3xl md:text-4xl">JavaScript</h1>
      <p class="max-w-prose">
        Chaque chapitre commence par un court rappel, puis des exercices à résoudre dans l’ordre.
        Rien n’est verrouillé : sautez ce que vous savez déjà.
      </p>
    </header>

    <p
      v-if="error"
      role="alert"
      class="rounded-md border border-red-500/50 p-3 text-red-600 dark:text-red-400"
    >
      {{ apiErrorMessage(error, 'Le parcours est injoignable pour l’instant.') }}
    </p>

    <NuxtLink
      v-if="nextUp"
      :to="`/javascript/${nextUp.chapter.slug}/${nextUp.exercise.slug}`"
      class="bg-foreground text-background justify-self-start rounded-md px-4 py-2 font-semibold"
    >
      Continuer : {{ nextUp.chapter.title }} — {{ nextUp.exercise.title }}
    </NuxtLink>
    <p v-else-if="chapters.length" class="font-semibold">Parcours terminé. Bravo !</p>

    <ol class="grid gap-3">
      <li v-for="chapter in chapters" :key="chapter.slug">
        <NuxtLink
          :to="`/javascript/${chapter.slug}`"
          class="hover:bg-foreground/5 flex items-center justify-between gap-4 rounded-md border p-4"
        >
          <span class="text-title">{{ chapter.position }}. {{ chapter.title }}</span>
          <span class="text-body-sm text-muted-foreground flex items-center gap-3">
            <span aria-hidden="true" class="tracking-widest">
              <template v-for="e in chapter.exercises" :key="e.slug">{{
                isDone(e.slug) ? '●' : '○'
              }}</template>
            </span>
            {{ chapter.exercises.filter((e) => isDone(e.slug)).length }}/{{
              chapter.exercises.length
            }}
          </span>
        </NuxtLink>
      </li>
    </ol>
  </section>
</template>
