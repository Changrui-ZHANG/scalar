<script setup lang="ts">
useSeoMeta({
  title: 'Connaissance — Scalar',
  description: 'Des cours par langage, du débutant à l’avancé, et des cours de conception communs.',
})

const { languages } = await useLanguages()
const { data } = await useFetch<ApiResponse<SectionView[]>>(() => apiUrl('/lessons/transverse'), {
  key: 'lessons-transverse',
})
const transverse = computed(() => data.value?.data ?? [])
</script>

<template>
  <section class="grid gap-8 py-8">
    <BreadcrumbTrail :items="[{ label: 'Connaissance' }]" />

    <header class="grid gap-2">
      <h1 class="font-display text-3xl md:text-4xl">Connaissance</h1>
      <p class="max-w-prose">
        Des cours à lire à votre rythme, par langage et par niveau. Chaque cours lié au parcours
        propose un raccourci pour s’exercer.
      </p>
    </header>

    <ol class="grid gap-3 md:grid-cols-2">
      <li v-for="(item, i) in languages" :key="item.slug">
        <NuxtLink
          :to="`/connaissance/${item.slug}`"
          class="hover:bg-foreground/5 grid h-full gap-1 rounded-md border p-4"
        >
          <span class="text-title">{{ i + 1 }}. {{ item.label }}</span>
          <span class="text-body-sm text-muted-foreground">
            Débutant, intermédiaire, avancé et écosystème.
          </span>
        </NuxtLink>
      </li>
    </ol>

    <div
      v-for="section in transverse"
      :id="section.slug"
      :key="section.slug"
      class="grid scroll-mt-4 gap-3"
    >
      <h2 class="text-title">
        {{ section.label }}
        <span class="text-body-sm text-muted-foreground">— valable pour tous les langages</span>
      </h2>
      <template v-for="group in section.groups" :key="group.slug">
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
      </template>
    </div>
  </section>
</template>
