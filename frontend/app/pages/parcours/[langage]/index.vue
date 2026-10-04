<script setup lang="ts">
const route = useRoute()
const languageSlug = computed(() => String(route.params.langage))

const { find } = await useLanguages()
const language = computed(() => find(languageSlug.value))
if (!language.value) {
  throw createError({ statusCode: 404, statusMessage: 'Langage inconnu', fatal: true })
}

useSeoMeta({
  title: () => `Parcours ${language.value?.label} — Scalar`,
  description: () =>
    `Apprendre ${language.value?.label} chapitre par chapitre, en écrivant du vrai code.`,
})

const { data, error } = await useFetch<ApiResponse<ChapterSummary[]>>(
  () => apiUrl(`/languages/${seg(languageSlug.value)}/chapters`),
  { key: `chapters-${languageSlug.value}` },
)

const chapters = computed(() => data.value?.data ?? [])
const { statusOf } = useProgress()

// ponytail: « tente » compte comme fait tant qu'il n'y a pas de verdict
// automatique ; ne garder que « reussi » quand la correction existera.
const isDone = (chapter: string, exercise: string) =>
  ['attempted', 'passed'].includes(statusOf(exerciseKey(languageSlug.value, chapter, exercise)))

/** Premier exercice pas encore fait, dans l'ordre du parcours. */
const nextUp = computed(() => {
  for (const chapter of chapters.value) {
    const exercise = chapter.exercises.find((e) => !isDone(chapter.slug, e.slug))
    if (exercise) {
      return { chapter, exercise }
    }
  }
  return null
})
</script>

<template>
  <section class="grid gap-8 py-8">
    <BreadcrumbTrail
      :items="[{ label: 'Parcours', to: '/parcours' }, { label: language?.label ?? '' }]"
    />

    <header class="grid gap-2">
      <h1 class="font-display text-3xl md:text-4xl">{{ language?.label }}</h1>
      <p class="max-w-prose">
        Chaque chapitre commence par un court résumé, puis des exercices à résoudre dans l’ordre.
        Rien n’est verrouillé : sautez ce que vous savez déjà.
      </p>
      <p v-if="language?.prerequisite" class="text-body-sm text-muted-foreground max-w-prose">
        Ce parcours suppose les bases de {{ language.prerequisite.label }}.
        <NuxtLink :to="`/parcours/${language.prerequisite.slug}`" class="underline">
          Commencer par {{ language.prerequisite.label }}
        </NuxtLink>
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
      :to="`/parcours/${languageSlug}/${nextUp.chapter.slug}/${nextUp.exercise.slug}`"
      class="bg-foreground text-background justify-self-start rounded-md px-4 py-2 font-semibold"
    >
      Continuer : {{ nextUp.chapter.number }}.{{ nextUp.exercise.number }}
      {{ nextUp.exercise.title }}
    </NuxtLink>
    <p v-else-if="chapters.length" class="font-semibold">Parcours terminé. Bravo !</p>

    <ol class="grid gap-3">
      <li v-for="chapter in chapters" :key="chapter.slug">
        <NuxtLink
          :to="`/parcours/${languageSlug}/${chapter.slug}`"
          class="hover:bg-foreground/5 flex items-center justify-between gap-4 rounded-md border p-4"
        >
          <span class="text-title">{{ chapter.number }}. {{ chapter.title }}</span>
          <span class="text-body-sm text-muted-foreground flex items-center gap-3">
            <span aria-hidden="true" class="tracking-widest">
              <template v-for="e in chapter.exercises" :key="e.slug">{{
                isDone(chapter.slug, e.slug) ? '●' : '○'
              }}</template>
            </span>
            {{ chapter.exercises.filter((e) => isDone(chapter.slug, e.slug)).length }}/{{
              chapter.exercises.length
            }}
          </span>
        </NuxtLink>
      </li>
    </ol>
  </section>
</template>
