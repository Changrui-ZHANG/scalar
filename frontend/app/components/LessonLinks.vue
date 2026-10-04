<script setup lang="ts">
/** Raccourcis « Revoir le cours » vers la section Connaissance, pour un chapitre. */
const props = defineProps<{ languageSlug: string; chapterSlug: string; title?: string }>()

// Complement de la page : une panne ici ne doit rien casser, on n'affiche rien.
const { data } = await useFetch<ApiResponse<LessonLink[]>>(
  () => apiUrl(`/languages/${seg(props.languageSlug)}/chapters/${seg(props.chapterSlug)}/lessons`),
  { key: `chapter-lessons-${props.languageSlug}-${props.chapterSlug}` },
)

const lessons = computed(() => data.value?.data ?? [])
</script>

<template>
  <div v-if="lessons.length" class="grid gap-2">
    <h2 class="text-title">{{ title ?? 'Revoir le cours' }}</h2>
    <ul class="flex flex-wrap gap-2">
      <li v-for="lesson in lessons" :key="`${lesson.section.slug}/${lesson.slug}`">
        <NuxtLink
          :to="`/connaissance/${lesson.section.slug}/${lesson.slug}`"
          class="hover:bg-foreground/5 inline-block rounded-md border px-3 py-1"
        >
          {{ lesson.number }}. {{ lesson.title }}
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>
