<script setup lang="ts">
const route = useRoute()
const sectionSlug = computed(() => String(route.params.section))
const lessonSlug = computed(() => String(route.params.lecon))

const { data, error } = await useFetch<ApiResponse<LessonDetail>>(
  () => apiUrl(`/lessons/${seg(sectionSlug.value)}/${seg(lessonSlug.value)}`),
  { key: `lesson-${sectionSlug.value}-${lessonSlug.value}` },
)

if (error.value?.statusCode === 404) {
  throw createError({ statusCode: 404, statusMessage: 'Cours introuvable', fatal: true })
}

const lesson = computed(() => data.value?.data ?? null)

/**
 * Fil d'Ariane : Connaissance / section / categorie / lecon. Une categorie
 * transverse est deja la section : on ne la repete pas.
 */
const crumbs = computed(() => {
  const l = lesson.value
  if (!l) {
    return [{ label: 'Connaissance', to: '/connaissance' }, { label: 'Cours' }]
  }
  const sectionTo =
    l.section.kind === 'category'
      ? `/connaissance#${l.section.slug}`
      : `/connaissance/${l.section.slug}`
  return [
    { label: 'Connaissance', to: '/connaissance' },
    { label: l.section.label, to: sectionTo },
    ...(l.section.kind === 'language'
      ? [{ label: l.category.label, to: `/connaissance/${l.section.slug}#${l.category.slug}` }]
      : []),
    { label: l.title },
  ]
})

const reviewedOn = computed(() =>
  lesson.value?.reviewedAt
    ? new Date(lesson.value.reviewedAt).toLocaleDateString('fr-FR', { dateStyle: 'long' })
    : null,
)

useSeoMeta({
  title: () => `${lesson.value?.title ?? 'Cours'} — Connaissance — Scalar`,
  description: () => lesson.value?.summary.replaceAll('`', '') ?? '',
})
</script>

<template>
  <article class="grid gap-8 py-8">
    <BreadcrumbTrail :items="crumbs" />

    <p
      v-if="error"
      role="alert"
      class="rounded-md border border-red-500/50 p-3 text-red-600 dark:text-red-400"
    >
      {{ apiErrorMessage(error, 'Le cours est injoignable pour l’instant.') }}
    </p>

    <template v-if="lesson">
      <header class="grid gap-2">
        <p class="text-body-sm text-muted-foreground">
          {{ lesson.category.label }} · cours {{ lesson.number }} sur {{ lesson.category.size
          }}<template v-if="lesson.section.kind === 'category'"> · tous langages</template>
        </p>
        <h1 class="font-display text-3xl md:text-4xl">{{ lesson.title }}</h1>
        <RichText :source="lesson.summary" class="text-muted-foreground" />
        <p v-if="reviewedOn" class="text-body-sm text-muted-foreground">Relu le {{ reviewedOn }}</p>
      </header>

      <RichText :source="lesson.content" />

      <aside v-if="lesson.chapters.length" class="grid gap-3 rounded-md border p-4">
        <h2 class="text-title">S’exercer</h2>
        <ul class="flex flex-wrap gap-2">
          <li v-for="chapter in lesson.chapters" :key="`${chapter.languageSlug}/${chapter.slug}`">
            <NuxtLink
              :to="`/parcours/${chapter.languageSlug}/${chapter.slug}`"
              class="bg-foreground text-background inline-block rounded-md px-4 py-2 font-semibold"
            >
              Chapitre {{ chapter.number }}. {{ chapter.title }} →
            </NuxtLink>
          </li>
        </ul>
      </aside>

      <nav
        v-if="lesson.previous || lesson.next"
        aria-label="Progression"
        class="flex flex-wrap justify-between gap-3 border-t pt-6"
      >
        <NuxtLink
          v-if="lesson.previous"
          :to="`/connaissance/${lesson.section.slug}/${lesson.previous.slug}`"
          class="hover:bg-foreground/5 grid gap-1 rounded-md border px-4 py-2"
        >
          <span class="text-body-sm text-muted-foreground">← Cours précédent</span>
          <span>{{ lesson.previous.title }}</span>
        </NuxtLink>
        <span v-else />
        <NuxtLink
          v-if="lesson.next"
          :to="`/connaissance/${lesson.section.slug}/${lesson.next.slug}`"
          class="hover:bg-foreground/5 grid gap-1 rounded-md border px-4 py-2 text-right"
        >
          <span class="text-body-sm text-muted-foreground">Cours suivant →</span>
          <span class="font-semibold">{{ lesson.next.title }}</span>
        </NuxtLink>
      </nav>
    </template>
  </article>
</template>
