<script setup lang="ts">
const route = useRoute()
const languageSlug = computed(() => String(route.params.langage))
const chapterSlug = computed(() => String(route.params.chapitre))

const { data, error } = await useFetch<ApiResponse<ChapterDetail>>(
  () => apiUrl(`/languages/${seg(languageSlug.value)}/chapters/${seg(chapterSlug.value)}`),
  { key: `chapter-${languageSlug.value}-${chapterSlug.value}` },
)

// Le chemin complet suffit : l'API repond 404 hors de la bonne hierarchie.
if (error.value?.statusCode === 404) {
  throw createError({ statusCode: 404, statusMessage: 'Chapitre introuvable', fatal: true })
}

const chapter = computed(() => data.value?.data ?? null)
const { statusOf } = useProgress()

useSeoMeta({
  title: () => `${chapter.value?.title ?? 'Chapitre'} — ${chapter.value?.language.label} — Scalar`,
})
</script>

<template>
  <section class="grid gap-8 py-8">
    <BreadcrumbTrail
      :items="[
        { label: 'Parcours', to: '/parcours' },
        { label: chapter?.language.label ?? '', to: `/parcours/${languageSlug}` },
        { label: chapter ? `${chapter.number}. ${chapter.title}` : 'Chapitre' },
      ]"
    />

    <p
      v-if="error"
      role="alert"
      class="rounded-md border border-red-500/50 p-3 text-red-600 dark:text-red-400"
    >
      {{ apiErrorMessage(error, 'Le chapitre est injoignable pour l’instant.') }}
    </p>

    <template v-if="chapter">
      <header class="grid gap-2">
        <p class="text-body-sm text-muted-foreground">Chapitre {{ chapter.number }}</p>
        <h1 class="font-display text-3xl md:text-4xl">{{ chapter.title }}</h1>
      </header>

      <!-- La lecon liee reste la reference : ce resume n'en reprend que l'essentiel. -->
      <div class="grid gap-2">
        <h2 class="text-title">En bref</h2>
        <RichText :source="chapter.summary" />
      </div>

      <LessonLinks
        :language-slug="languageSlug"
        :chapter-slug="chapter.slug"
        title="Lire le cours complet"
      />

      <div class="grid gap-3">
        <h2 class="text-title">Exercices</h2>
        <ol class="grid gap-2">
          <li v-for="exercise in chapter.exercises" :key="exercise.slug">
            <NuxtLink
              :to="`/parcours/${languageSlug}/${chapter.slug}/${exercise.slug}`"
              class="hover:bg-foreground/5 flex items-center justify-between gap-4 rounded-md border p-3"
            >
              <span>{{ chapter.number }}.{{ exercise.number }} {{ exercise.title }}</span>
              <span class="text-body-sm text-muted-foreground">
                {{
                  STATUS_LABELS[statusOf(exerciseKey(languageSlug, chapter.slug, exercise.slug))]
                }}
              </span>
            </NuxtLink>
          </li>
        </ol>
      </div>
    </template>
  </section>
</template>
