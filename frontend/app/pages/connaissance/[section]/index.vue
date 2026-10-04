<script setup lang="ts">
/** Une section de Connaissance : un langage, ou une categorie valable pour tous. */
const route = useRoute()
const sectionSlug = computed(() => String(route.params.section))

const { data, error } = await useFetch<ApiResponse<SectionView>>(
  () => apiUrl(`/lessons/${seg(sectionSlug.value)}`),
  { key: `lessons-${sectionSlug.value}` },
)

if (error.value?.statusCode === 404) {
  throw createError({ statusCode: 404, statusMessage: 'Section introuvable', fatal: true })
}

const section = computed(() => data.value?.data ?? null)

/** Point de depart du programme : la premiere lecon de la premiere categorie. */
const firstLesson = computed(() => section.value?.groups[0]?.lessons[0] ?? null)

useSeoMeta({
  title: () => `Connaissance ${section.value?.label ?? ''} — Scalar`,
  description: () =>
    `Des cours sur ${section.value?.label ?? ''}, reliés aux exercices du parcours.`,
})
</script>

<template>
  <section class="grid gap-8 py-8">
    <BreadcrumbTrail
      :items="[{ label: 'Connaissance', to: '/connaissance' }, { label: section?.label ?? '' }]"
    />

    <p
      v-if="error"
      role="alert"
      class="rounded-md border border-red-500/50 p-3 text-red-600 dark:text-red-400"
    >
      {{ apiErrorMessage(error, 'Les cours sont injoignables pour l’instant.') }}
    </p>

    <template v-if="section">
      <header class="grid gap-2">
        <h1 class="font-display text-3xl md:text-4xl">{{ section.label }}</h1>
        <p class="max-w-prose">
          <template v-if="section.kind === 'category'">
            Des cours valables pour tous les langages, à lire dans l’ordre.
          </template>
          <template v-else>
            Des cours à lire à votre rythme, du débutant à l’avancé. Chaque cours lié au parcours
            propose un raccourci pour s’exercer.
          </template>
        </p>
      </header>

      <NuxtLink
        v-if="firstLesson"
        :to="`/connaissance/${section.slug}/${firstLesson.slug}`"
        class="bg-foreground text-background justify-self-start rounded-md px-4 py-2 font-semibold"
      >
        Commencer par le premier cours : {{ firstLesson.title }}
      </NuxtLink>

      <div
        v-for="group in section.groups"
        :id="group.slug"
        :key="group.slug"
        class="grid scroll-mt-4 gap-3"
      >
        <!-- Une categorie transverse est deja le titre de la page : pas de doublon. -->
        <h2 v-if="section.kind === 'language'" class="text-title">{{ group.label }}</h2>
        <ol class="grid gap-2 md:grid-cols-2">
          <li v-for="lesson in group.lessons" :key="lesson.slug">
            <NuxtLink
              :to="`/connaissance/${section.slug}/${lesson.slug}`"
              class="hover:bg-foreground/5 grid h-full gap-1 rounded-md border p-4"
            >
              <span class="font-semibold">{{ lesson.number }}. {{ lesson.title }}</span>
              <RichText :source="lesson.summary" class="text-body-sm text-muted-foreground" />
            </NuxtLink>
          </li>
        </ol>
      </div>

      <p v-if="section.kind === 'language'" class="text-body-sm text-muted-foreground">
        Nommage, architecture : les cours valables pour tous les langages sont sur
        <NuxtLink to="/connaissance" class="underline">l’accueil de Connaissance</NuxtLink>.
      </p>
    </template>
  </section>
</template>
