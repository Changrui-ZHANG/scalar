<script setup lang="ts">
/**
 * L'ancienne section Connaissance n'existe plus : ses lecons vivent dans les
 * parcours. Les liens deja partages menent a la meme lecon plutot qu'a un 404.
 *
 * /connaissance                        -> /parcours
 * /connaissance/javascript             -> /parcours/javascript
 * /connaissance/javascript/conditions  -> /parcours/javascript/lecon/conditions,
 *                                         qui redirige a son tour sous le chapitre
 * /connaissance/inconnu/…              -> /parcours
 */
const route = useRoute()
const [section, lesson] = ([] as string[]).concat(route.params.chemin ?? [])

const { find } = await useTracks()
const track = section ? find(section) : null

const target = !track
  ? '/parcours'
  : lesson
    ? `/parcours/${seg(track.slug)}/lecon/${seg(lesson)}`
    : `/parcours/${seg(track.slug)}`

await navigateTo(target, { redirectCode: 301, replace: true })
</script>

<template>
  <p class="py-10">Redirection vers les parcours…</p>
</template>
