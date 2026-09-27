<script setup lang="ts">
const route = useRoute()
const slug = computed(() => String(route.params.chapitre))

const { data, error } = await useFetch<ApiResponse<ChapterDetail>>(
  () => apiUrl(`/chapters/${encodeURIComponent(slug.value)}`),
  { key: `chapter-${slug.value}` },
)

if (error.value?.statusCode === 404) {
  throw createError({ statusCode: 404, statusMessage: 'Chapitre introuvable', fatal: true })
}

const chapter = computed(() => data.value?.data ?? null)
const { statusOf } = useProgress()

useSeoMeta({
  title: () => `${chapter.value?.title ?? 'Chapitre'} — JavaScript — Scalar`,
})
</script>

<template>
  <section class="grid gap-8 py-8">
    <nav class="text-body-sm text-muted-foreground">
      <NuxtLink to="/javascript" class="underline">JavaScript</NuxtLink>
    </nav>

    <p
      v-if="error"
      role="alert"
      class="rounded-md border border-red-500/50 p-3 text-red-600 dark:text-red-400"
    >
      {{ apiErrorMessage(error, 'Le chapitre est injoignable pour l’instant.') }}
    </p>

    <template v-if="chapter">
      <header class="grid gap-2">
        <p class="text-body-sm text-muted-foreground">Chapitre {{ chapter.position }}</p>
        <h1 class="font-display text-3xl md:text-4xl">{{ chapter.title }}</h1>
      </header>

      <div class="grid gap-2">
        <h2 class="text-title">Rappel de cours</h2>
        <RichText :source="chapter.lesson" />
      </div>

      <div class="grid gap-3">
        <h2 class="text-title">Exercices</h2>
        <ol class="grid gap-2">
          <li v-for="exercise in chapter.exercises" :key="exercise.slug">
            <NuxtLink
              :to="`/javascript/${chapter.slug}/${exercise.slug}`"
              class="hover:bg-foreground/5 flex items-center justify-between gap-4 rounded-md border p-3"
            >
              <span>{{ exercise.position }}. {{ exercise.title }}</span>
              <span class="text-body-sm text-muted-foreground">
                {{ STATUS_LABELS[statusOf(exercise.slug)] }}
              </span>
            </NuxtLink>
          </li>
        </ol>
      </div>
    </template>
  </section>
</template>
