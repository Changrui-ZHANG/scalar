<script setup lang="ts">
/**
 * Ancienne adresse d'une lecon, avant qu'elle ne passe sous son chapitre.
 * Les liens deja partages menent a la meme lecon plutot qu'a un 404.
 */
const route = useRoute()
const trackSlug = String(route.params.parcours)
const lessonSlug = String(route.params.lecon)

const { data } = await useFetch<ApiResponse<TrackView>>(apiUrl(`/tracks/${seg(trackSlug)}`), {
  key: `track-${trackSlug}`,
})
// Premier chapitre qui la contient : l'ancienne adresse ne disait pas lequel.
const chapter = data.value?.data?.chapters.find((c) => c.lessons.some((l) => l.slug === lessonSlug))
if (!chapter) {
  throw createError({ statusCode: 404, statusMessage: 'Leçon introuvable', fatal: true })
}

await navigateTo(`/parcours/${seg(trackSlug)}/${seg(chapter.slug)}/lecon/${seg(lessonSlug)}`, {
  redirectCode: 301,
  replace: true,
})
</script>

<template>
  <p class="py-10">Redirection vers la leçon…</p>
</template>
